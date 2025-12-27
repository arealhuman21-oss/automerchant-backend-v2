# 🤖 AI DELEGATION TASKS - Phase 3

**Created**: December 26, 2025
**Phase**: 3 - Extract Controllers & Services
**Goal**: Separate business logic from routes → Clean MVC architecture

**Phase 2 Status**: ✅ COMPLETE (server.js: 3956 → 857 lines)

---

## 🎯 PHASE 3 OVERVIEW

**What we're doing**:
1. Extract route handlers → Controllers
2. Extract business logic → Services
3. Extract database queries → Models
4. Deploy to Vercel (QWEN WILL DO THIS!)

**Expected Result**:
- Routes only handle HTTP (request → controller → response)
- Controllers orchestrate (validate → call services → format response)
- Services contain business logic (analysis, recommendations, etc.)
- Models handle all database operations

---

## 📦 TASK 1: Extract Analysis Service (GEMINI - START HERE)

**Priority**: CRITICAL - Biggest logic block
**AI**: Gemini Pro (this is complex logic)
**Time**: 30 minutes

### Instructions for Gemini:

The analysis logic is the most complex part. Extract it from `server.js` into a service.

#### 1A: Create Analysis Service

**File to create**: `backend/services/analysis.service.js`

**What to extract from server.js**:
- `runAnalysisForUser()` function (huge function ~200 lines)
- All V3 algorithm imports and logic
- Order fetching logic
- Recommendation creation logic

**Template structure**:
```javascript
const { supabase } = require('../config/database');
const { analyzeProduct } = require('../analyzeProduct-v3');
const {
  loadRegretBudgets,
  loadElasticityLearners,
  loadPriceChangeObservations
} = require('../v3-persistence');

/**
 * Run full analysis for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Analysis results
 */
async function runAnalysisForUser(userId) {
  // TODO: Copy full runAnalysisForUser logic from server.js
  // This function should:
  // 1. Fetch user's products
  // 2. Fetch Shopify orders
  // 3. Load V3 state
  // 4. Run analysis on each product
  // 5. Save recommendations
  // 6. Return results
}

/**
 * Check if manual analysis is allowed (10/day limit)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { allowed, used, remaining }
 */
async function checkManualAnalysisLimit(userId) {
  // TODO: Copy manual analysis limit check from server.js
  // Use the RPC function: check_and_increment_manual_analysis
}

/**
 * Get analysis status (timer, limits, etc.)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Status object
 */
async function getAnalysisStatus(userId) {
  // TODO: Copy status check logic from /api/analysis/status endpoint
}

module.exports = {
  runAnalysisForUser,
  checkManualAnalysisLimit,
  getAnalysisStatus
};
```

#### 1B: Find the Logic in server.js

**Search for these functions**:
1. Search: `async function runAnalysisForUser`
2. Search: `check_and_increment_manual_analysis`
3. Search: `/api/analysis/status` endpoint logic

**Copy entire functions** - Don't modify the logic, just move it!

### Success Criteria:
- [ ] `backend/services/analysis.service.js` created
- [ ] Contains `runAnalysisForUser` function
- [ ] Contains `checkManualAnalysisLimit` function
- [ ] Contains `getAnalysisStatus` function
- [ ] All imports are correct
- [ ] No syntax errors
- [ ] Report back: "✅ TASK 1 COMPLETE - Analysis service extracted"

---

## 🏪 TASK 2: Extract Shopify Service (GEMINI - AFTER TASK 1)

**Priority**: HIGH
**AI**: Gemini Pro
**Time**: 20 minutes

### Instructions for Gemini:

Extract all Shopify API interaction logic into a service.

**File to create**: `backend/services/shopify.service.js`

**What to extract**:
- Shopify product fetching
- Shopify order fetching
- Price update logic
- OAuth token exchange

**Functions to create**:

```javascript
const axios = require('axios');
const { supabase } = require('../config/database');

/**
 * Fetch all products from Shopify
 * @param {string} shop - Shop domain
 * @param {string} accessToken - Shopify access token
 * @returns {Promise<Array>} Products array
 */
async function fetchShopifyProducts(shop, accessToken) {
  // TODO: Copy product fetching logic from products.routes.js (sync endpoint)
}

/**
 * Fetch orders from Shopify (last 30 days)
 * @param {string} shop - Shop domain
 * @param {string} accessToken - Shopify access token
 * @returns {Promise<Array>} Orders array
 */
async function fetchShopifyOrders(shop, accessToken, daysBack = 30) {
  // TODO: Copy order fetching logic from server.js (in runAnalysisForUser)
}

/**
 * Update product price on Shopify
 * @param {string} shop - Shop domain
 * @param {string} accessToken - Shopify access token
 * @param {string} variantId - Variant ID
 * @param {number} newPrice - New price
 * @returns {Promise<Object>} Update result
 */
async function updateProductPrice(shop, accessToken, variantId, newPrice) {
  // TODO: Copy price update logic from recommendations.routes.js (accept endpoint)
}

/**
 * Exchange OAuth code for access token
 * @param {string} shop - Shop domain
 * @param {string} code - OAuth code
 * @returns {Promise<Object>} Token response
 */
async function exchangeOAuthCode(shop, code) {
  // TODO: Copy token exchange from auth.routes.js (callback endpoint)
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyOrders,
  updateProductPrice,
  exchangeOAuthCode
};
```

**Where to find the logic**:
- `fetchShopifyProducts`: routes/products.routes.js → `/sync` endpoint
- `fetchShopifyOrders`: server.js → inside `runAnalysisForUser`
- `updateProductPrice`: routes/recommendations.routes.js → `/:id/accept`
- `exchangeOAuthCode`: routes/auth.routes.js → `/shopify/callback`

### Success Criteria:
- [ ] `backend/services/shopify.service.js` created
- [ ] All 4 functions implemented
- [ ] Uses axios for HTTP requests
- [ ] Proper error handling
- [ ] Report back: "✅ TASK 2 COMPLETE - Shopify service extracted"

---

## 🗄️ TASK 3: Create Database Models (QWEN - PARALLEL WITH TASK 4)

**Priority**: HIGH
**AI**: Qwen (lots of repetitive CRUD operations)
**Time**: 30 minutes

### Instructions for Qwen:

Create model files for each database table. Models handle ALL database queries.

#### 3A: User Model

**File to create**: `backend/models/user.model.js`

```javascript
const { supabase } = require('../config/database');

/**
 * Find user by email
 */
async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find user by ID
 */
async function findById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create new user
 */
async function create(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user
 */
async function update(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve user
 */
async function approve(userId) {
  return update(userId, { approved: true });
}

module.exports = {
  findByEmail,
  findById,
  create,
  update,
  approve
};
```

#### 3B: Product Model

**File to create**: `backend/models/product.model.js`

```javascript
const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function findById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

async function create(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function update(productId, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCostPrice(productId, costPrice) {
  return update(productId, { cost_price: costPrice });
}

async function toggleSelection(productId, selected) {
  return update(productId, { selected_for_analysis: selected });
}

async function bulkUpsert(products) {
  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'shopify_product_id,user_id' });

  if (error) throw error;
  return data;
}

module.exports = {
  findByUserId,
  findById,
  create,
  update,
  updateCostPrice,
  toggleSelection,
  bulkUpsert
};
```

#### 3C: Recommendation Model

**File to create**: `backend/models/recommendation.model.js`

```javascript
const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function findById(recommendationId) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', recommendationId)
    .single();

  if (error) throw error;
  return data;
}

async function create(recommendationData) {
  const { data, error } = await supabase
    .from('recommendations')
    .insert(recommendationData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsert(recommendationData) {
  const { data, error } = await supabase
    .from('recommendations')
    .upsert(recommendationData, { onConflict: 'user_id,product_id' });

  if (error) throw error;
  return data;
}

async function deleteById(recommendationId) {
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', recommendationId);

  if (error) throw error;
}

module.exports = {
  findByUserId,
  findById,
  create,
  upsert,
  deleteById
};
```

#### 3D: Schedule Model

**File to create**: `backend/models/schedule.model.js`

```javascript
const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
}

async function upsert(scheduleData) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .upsert(scheduleData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateNextDue(userId, nextDueDate) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .update({
      next_analysis_due: nextDueDate.toISOString(),
      last_analysis_run: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

async function findDueSchedules() {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .select('user_id')
    .lte('next_analysis_due', new Date().toISOString());

  if (error) throw error;
  return data || [];
}

module.exports = {
  findByUserId,
  upsert,
  updateNextDue,
  findDueSchedules
};
```

### Success Criteria:
- [ ] All 4 model files created
- [ ] Each exports CRUD functions
- [ ] Uses Supabase client correctly
- [ ] Proper error handling
- [ ] Report back: "✅ TASK 3 COMPLETE - 4 models created"

---

## 🎮 TASK 4: Create Controllers (GEMINI - PARALLEL WITH TASK 3)

**Priority**: HIGH
**AI**: Gemini Pro
**Time**: 40 minutes

### Instructions for Gemini:

Controllers orchestrate the request/response flow. They validate input, call services, and format responses.

#### 4A: Analysis Controller

**File to create**: `backend/controllers/analysis.controller.js`

```javascript
const analysisService = require('../services/analysis.service');

/**
 * GET /api/analysis/status
 * Get analysis timer and limits
 */
async function getStatus(req, res) {
  try {
    const userId = req.user.id;
    const status = await analysisService.getAnalysisStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error getting analysis status:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
}

/**
 * POST /api/analyze
 * Run manual analysis
 */
async function runManualAnalysis(req, res) {
  try {
    const userId = req.user.id;

    // Check limit
    const limitCheck = await analysisService.checkManualAnalysisLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Daily limit reached',
        used: limitCheck.used,
        remaining: limitCheck.remaining
      });
    }

    // Run analysis
    const results = await analysisService.runAnalysisForUser(userId);

    res.json({
      success: true,
      ...results,
      manualUsed: limitCheck.used,
      manualRemaining: limitCheck.remaining
    });
  } catch (error) {
    console.error('Error running analysis:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStatus,
  runManualAnalysis
};
```

#### 4B: Products Controller

**File to create**: `backend/controllers/products.controller.js`

```javascript
const productModel = require('../models/product.model');
const shopifyService = require('../services/shopify.service');

/**
 * GET /api/products
 * Get user's products
 */
async function getProducts(req, res) {
  try {
    const userId = req.user.id;
    const products = await productModel.findByUserId(userId);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/**
 * POST /api/products/sync
 * Sync products from Shopify
 */
async function syncProducts(req, res) {
  try {
    const userId = req.user.id;
    const { shop, accessToken } = req.shopify; // Set by shopifyAuth middleware

    // Fetch from Shopify
    const shopifyProducts = await shopifyService.fetchShopifyProducts(shop, accessToken);

    // Transform and save
    const productsToSave = shopifyProducts.map(p => ({
      user_id: userId,
      shopify_product_id: p.id.toString(),
      shopify_variant_id: p.variants[0]?.id.toString(),
      title: p.title,
      price: parseFloat(p.variants[0]?.price || 0),
      inventory: p.variants[0]?.inventory_quantity || 0,
      image_url: p.image?.src
    }));

    await productModel.bulkUpsert(productsToSave);

    res.json({ success: true, count: productsToSave.length });
  } catch (error) {
    console.error('Error syncing products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/products/:id/cost-price
 * Update product cost price
 */
async function updateCostPrice(req, res) {
  try {
    const { id } = req.params;
    const { costPrice } = req.body;

    await productModel.updateCostPrice(parseInt(id), parseFloat(costPrice));
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cost price:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/products/:id/select
 * Toggle product selection for analysis
 */
async function toggleSelection(req, res) {
  try {
    const { id } = req.params;
    const { selected } = req.body;

    await productModel.toggleSelection(parseInt(id), selected);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling selection:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getProducts,
  syncProducts,
  updateCostPrice,
  toggleSelection
};
```

#### 4C: Recommendations Controller

**File to create**: `backend/controllers/recommendations.controller.js`

```javascript
const recommendationModel = require('../models/recommendation.model');
const productModel = require('../models/product.model');
const shopifyService = require('../services/shopify.service');

/**
 * GET /api/recommendations
 * Get all recommendations for user
 */
async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const recommendations = await recommendationModel.findByUserId(userId);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}

/**
 * POST /api/recommendations/:id/accept
 * Apply recommended price to Shopify
 */
async function acceptRecommendation(req, res) {
  try {
    const { id } = req.params;
    const { shop, accessToken } = req.shopify;

    // Get recommendation
    const rec = await recommendationModel.findById(parseInt(id));
    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Get product
    const product = await productModel.findById(rec.product_id);

    // Update Shopify
    await shopifyService.updateProductPrice(
      shop,
      accessToken,
      product.shopify_variant_id,
      rec.recommended_price
    );

    // Update local DB
    await productModel.update(product.id, { price: rec.recommended_price });

    // Delete recommendation (it's been applied)
    await recommendationModel.deleteById(rec.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/recommendations/:id/reject
 * Reject recommendation
 */
async function rejectRecommendation(req, res) {
  try {
    const { id } = req.params;
    await recommendationModel.deleteById(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getRecommendations,
  acceptRecommendation,
  rejectRecommendation
};
```

### Success Criteria:
- [ ] All 3 controller files created
- [ ] Controllers use services and models
- [ ] Proper error handling
- [ ] Clear, concise functions
- [ ] Report back: "✅ TASK 4 COMPLETE - 3 controllers created"

---

## 🔌 TASK 5: Update Routes to Use Controllers (QWEN - AFTER TASKS 3-4)

**Priority**: HIGH
**AI**: Qwen (simple find/replace work)
**Time**: 20 minutes

### Instructions for Qwen:

Replace route logic with controller calls.

**Example - products.routes.js BEFORE**:
```javascript
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const products = await productModel.findByUserId(userId);
    res.json({ products });
  } catch (error) {
    // ... error handling
  }
});
```

**AFTER**:
```javascript
const productsController = require('../controllers/products.controller');

router.get('/', authenticateToken, productsController.getProducts);
router.post('/sync', authenticateToken, productsController.syncProducts);
router.post('/:id/cost-price', authenticateToken, productsController.updateCostPrice);
router.post('/:id/select', authenticateToken, productsController.toggleSelection);
```

**Files to update**:
1. `routes/analysis.routes.js` → Use `analysisController`
2. `routes/products.routes.js` → Use `productsController`
3. `routes/recommendations.routes.js` → Use `recommendationsController`

**Pattern**:
- Import controller at top
- Replace `async (req, res) => { ... }` with `controller.methodName`
- Remove all logic from route files

### Success Criteria:
- [ ] All 3 route files updated
- [ ] Routes only have controller references
- [ ] No inline logic in routes
- [ ] Report back: "✅ TASK 5 COMPLETE - Routes use controllers"

---

## 🧹 TASK 6: Clean Up server.js (GEMINI - AFTER TASKS 1-5)

**Priority**: HIGH
**AI**: Gemini Pro
**Time**: 15 minutes

### Instructions for Gemini:

Now that logic is extracted, remove it from server.js.

**What to remove**:
1. `runAnalysisForUser` function (moved to service)
2. Any duplicate imports (already in services)
3. Unused helper functions

**What to keep**:
- Auto-analysis cron (setInterval) - but UPDATE to use service:
  ```javascript
  const analysisService = require('./services/analysis.service');

  setInterval(async () => {
    const scheduleModel = require('./models/schedule.model');
    const dueUsers = await scheduleModel.findDueSchedules();

    for (const row of dueUsers) {
      await analysisService.runAnalysisForUser(row.user_id);
      // ... update schedule
    }
  }, 30 * 60 * 1000);
  ```

**Goal**: server.js should be < 500 lines and mostly routing + cron setup.

### Success Criteria:
- [ ] Duplicate logic removed
- [ ] Cron uses analysisService
- [ ] server.js < 500 lines
- [ ] No syntax errors
- [ ] Report back: "✅ TASK 6 COMPLETE - server.js cleaned (X lines)"

---

## 🧪 TASK 7: Verify & Test (CLAUDE - FINAL REVIEW)

**Priority**: CRITICAL
**AI**: Claude (me - final check only!)
**Time**: 10 minutes

I'll verify:
1. ✅ Server starts
2. ✅ All tests pass
3. ✅ server.js < 500 lines
4. ✅ MVC structure correct

---

## 🚀 TASK 8: DEPLOY TO VERCEL (QWEN - SAVE CLAUDE TOKENS!)

**Priority**: HIGH
**AI**: Qwen (free deployment!)
**Time**: 10 minutes

### Instructions for Qwen:

Deploy the refactored backend to Vercel!

**Commands**:
```bash
cd backend

# Deploy to production
vercel --prod

# Wait for deployment
# Copy the deployment URL

# Test the health endpoint
curl https://automerchant-backend-v2.vercel.app/health
```

**Success message to show user**:
```
✅ DEPLOYMENT COMPLETE!

Backend URL: https://automerchant-backend-v2.vercel.app
Health Check: ✅ OK

Changes deployed:
- Modular architecture (MVC)
- Services extracted
- Models extracted
- Controllers extracted
- server.js optimized

Ready for production! 🚀
```

### Success Criteria:
- [ ] Deployment successful
- [ ] Health endpoint returns 200
- [ ] Report deployment URL
- [ ] Report back: "✅ TASK 8 COMPLETE - Deployed to Vercel!"

---

## 📊 TASK SUMMARY

| Task | AI | Status | Time Est | Can Run in Parallel? |
|------|-----|--------|----------|---------------------|
| 1. Analysis Service | Gemini | ⏳ TODO | 30 min | START FIRST |
| 2. Shopify Service | Gemini | ⏳ TODO | 20 min | After Task 1 |
| 3. Database Models | Qwen | ⏳ TODO | 30 min | Parallel with Task 4 |
| 4. Controllers | Gemini | ⏳ TODO | 40 min | Parallel with Task 3 |
| 5. Update Routes | Qwen | ⏳ TODO | 20 min | After Tasks 3-4 |
| 6. Clean server.js | Gemini | ⏳ TODO | 15 min | After Tasks 1-5 |
| 7. Verify | Claude | ⏳ TODO | 10 min | After Task 6 |
| 8. Deploy | Qwen | ⏳ TODO | 10 min | After Task 7 ✅ |

**Total Time**: ~2.5 hours
**Claude Usage**: 10 minutes only (Task 7)!
**Qwen handles deployment**: SAVES YOUR TOKENS! 🎯

---

## 🚀 EXECUTION ORDER

**CRITICAL - DO IN THIS ORDER**:

1. **Gemini**: Task 1 (Analysis Service) - 30 min
2. **Gemini**: Task 2 (Shopify Service) - 20 min
3. **PARALLEL**:
   - **Qwen**: Task 3 (Database Models) - 30 min
   - **Gemini**: Task 4 (Controllers) - 40 min
4. **Qwen**: Task 5 (Update Routes) - 20 min
5. **Gemini**: Task 6 (Clean server.js) - 15 min
6. **Claude**: Task 7 (Verify) - 10 min ⚠️ ONLY CALL CLAUDE HERE
7. **Qwen**: Task 8 (Deploy to Vercel) - 10 min 🚀

**Optimization**: Tasks 3 and 4 can run in parallel to save time!

---

## 💬 COMPLETION REPORTING

After each task:
```
✅ TASK X COMPLETE
AI: [Qwen/Gemini/Claude]
Time: [actual time]
Files: [files created/modified]
Issues: [any problems]
Next: [next task]
```

---

**Ready to start Phase 3? Run Gemini with Task 1!** 🎯
