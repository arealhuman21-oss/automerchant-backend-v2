# 🤖 AI DELEGATION TASKS - Phase 2

**Created**: December 26, 2025
**Phase**: 2 - Modularize Backend
**Goal**: Break server.js (3956 lines) → Modular architecture (< 500 lines)

---

## ⚡ TASK 1: Create Directory Structure (QWEN - START HERE)

**Priority**: HIGH - Do this FIRST
**AI**: Qwen (free, unlimited)
**Time**: 5 minutes

### Instructions for Qwen:

Create the following directory structure in `backend/`:

```bash
backend/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API routes
├── controllers/     # Route handlers
├── services/        # Business logic
├── models/          # Database queries
└── utils/           # Helper functions
```

### Commands to run:

```bash
cd backend

# Create directories
mkdir -p config
mkdir -p middleware
mkdir -p routes
mkdir -p controllers
mkdir -p services
mkdir -p models
mkdir -p utils

# Verify creation
ls -la | grep "^d"
```

### Success Criteria:
- [ ] All 7 directories created
- [ ] Directories exist under `backend/`
- [ ] Report back: "✅ TASK 1 COMPLETE - Directory structure created"

---

## 📦 TASK 2: Extract Configuration (GEMINI - AFTER TASK 1)

**Priority**: HIGH
**AI**: Gemini Pro (moderate usage)
**Time**: 15 minutes
**Dependencies**: Task 1 must be complete

### Instructions for Gemini:

Extract configuration from `backend/server.js` into separate files.

#### 2A: Extract Database Config

**File to create**: `backend/config/database.js`

**What to extract from server.js**:
- Supabase client initialization (lines ~26-30)
- DATABASE_URL setup
- Connection pooling config

**Template**:
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase };
```

#### 2B: Extract Environment Config

**File to create**: `backend/config/environment.js`

**What to extract**:
- All `process.env.*` references
- Environment validation
- Default values

**Template**:
```javascript
require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  AUTH_MODE: process.env.AUTH_MODE || 'oauth',

  // Shopify (if AUTH_MODE=manual)
  SHOP: process.env.SHOP,
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,

  // Algorithm
  USE_ALGORITHM_V3: process.env.USE_ALGORITHM_V3 === 'true',
  USE_ALGORITHM_V2: process.env.USE_ALGORITHM_V2 === 'true',

  // Admin
  ADMIN_SECRET: process.env.ADMIN_SECRET
};
```

### Success Criteria:
- [ ] `backend/config/database.js` created and exports `supabase`
- [ ] `backend/config/environment.js` created and exports all env vars
- [ ] Files are valid JavaScript (no syntax errors)
- [ ] Report back: "✅ TASK 2 COMPLETE - Configuration extracted"

---

## 🔐 TASK 3: Extract Middleware (GEMINI - AFTER TASK 2)

**Priority**: HIGH
**AI**: Gemini Pro (moderate usage)
**Time**: 20 minutes
**Dependencies**: Task 2 must be complete

### Instructions for Gemini:

Extract middleware functions from `backend/server.js` into separate files.

#### 3A: Extract Auth Middleware

**File to create**: `backend/middleware/auth.js`

**What to extract from server.js**:
- `authenticateToken` function (around line ~100-120)
- JWT verification logic

**Template**:
```javascript
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/environment');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
```

#### 3B: Extract CORS Middleware

**File to create**: `backend/middleware/cors.js`

**What to extract**:
- CORS configuration (around line ~35-45)
- Allowed origins

**Template**:
```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://automerchant.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
```

#### 3C: Extract Error Handler

**File to create**: `backend/middleware/errorHandler.js`

**What to create**:
- Global error handler for Express
- Logs errors and sends appropriate response

**Template**:
```javascript
function errorHandler(err, req, res, next) {
  console.error('❌ ERROR:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
```

### Success Criteria:
- [ ] `backend/middleware/auth.js` created with `authenticateToken`
- [ ] `backend/middleware/cors.js` created with CORS config
- [ ] `backend/middleware/errorHandler.js` created
- [ ] All files are valid JavaScript
- [ ] Report back: "✅ TASK 3 COMPLETE - Middleware extracted"

---

## 🛣️ TASK 4: Extract Routes (QWEN - PARALLEL WITH TASK 5)

**Priority**: HIGH
**AI**: Qwen (free, unlimited) - This is LOTS of file operations
**Time**: 30-45 minutes
**Dependencies**: Tasks 1-3 must be complete

### Instructions for Qwen:

Extract all routes from `backend/server.js` into separate route files. This is repetitive work perfect for Qwen!

#### 4A: Auth Routes

**File to create**: `backend/routes/auth.routes.js`

**Routes to extract** (search server.js for these):
- `POST /auth/shopify` - Initiate OAuth
- `GET /auth/shopify/callback` - OAuth callback
- `POST /check-approval` - Check user approval status

**Template**:
```javascript
const express = require('express');
const router = express.Router();

// POST /auth/shopify - Initiate Shopify OAuth
router.post('/shopify', async (req, res) => {
  // TODO: Copy logic from server.js
});

// GET /auth/shopify/callback - OAuth callback
router.get('/shopify/callback', async (req, res) => {
  // TODO: Copy logic from server.js
});

// POST /check-approval - Check if user is approved
router.post('/check-approval', async (req, res) => {
  // TODO: Copy logic from server.js
});

module.exports = router;
```

**How to find routes in server.js**:
1. Search for `app.post('/auth/shopify'`
2. Copy entire function (from `async (req, res) => {` to matching `}`)
3. Paste into router file
4. Repeat for each route

#### 4B: Products Routes

**File to create**: `backend/routes/products.routes.js`

**Routes to extract**:
- `GET /api/products` - Get user's products
- `POST /api/products/sync` - Sync from Shopify
- `POST /api/products/:id/select` - Select product for analysis
- `POST /api/products/:id/cost-price` - Update cost price

**Template**:
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  // TODO: Copy logic from server.js
});

// POST /api/products/sync
router.post('/sync', authenticateToken, async (req, res) => {
  // TODO: Copy logic from server.js
});

// POST /api/products/:id/select
router.post('/:id/select', authenticateToken, async (req, res) => {
  // TODO: Copy logic from server.js
});

// POST /api/products/:id/cost-price
router.post('/:id/cost-price', authenticateToken, async (req, res) => {
  // TODO: Copy logic from server.js
});

module.exports = router;
```

#### 4C: Analysis Routes

**File to create**: `backend/routes/analysis.routes.js`

**Routes to extract**:
- `GET /api/analysis/status` - Get timer + limits
- `POST /api/analyze` - Run manual analysis

#### 4D: Recommendations Routes

**File to create**: `backend/routes/recommendations.routes.js`

**Routes to extract**:
- `GET /api/recommendations` - Get all recommendations
- `POST /api/recommendations/:id/accept` - Apply price
- `POST /api/recommendations/:id/reject` - Reject recommendation

#### 4E: Admin Routes

**File to create**: `backend/routes/admin.routes.js`

**Routes to extract**:
- `GET /api/admin/stats` - Admin statistics
- `POST /api/admin/approve-user` - Approve user
- Any other `/api/admin/*` routes

### Important Notes for Qwen:
1. **Don't modify logic** - Just copy/paste entire route handlers
2. **Keep all comments** - Preserve existing comments
3. **Import dependencies** - Add all `require()` statements needed
4. **Use authenticateToken** - Import from `../middleware/auth`
5. **Export router** - End each file with `module.exports = router;`

### Success Criteria:
- [ ] All 5 route files created
- [ ] All routes moved from server.js
- [ ] Each file exports Express router
- [ ] No syntax errors
- [ ] Report back: "✅ TASK 4 COMPLETE - Routes extracted (X routes total)"

---

## 🔌 TASK 5: Wire Everything Together (GEMINI - AFTER TASKS 2-4)

**Priority**: HIGH
**AI**: Gemini Pro (moderate usage)
**Time**: 20 minutes
**Dependencies**: Tasks 2, 3, 4 must be complete

### Instructions for Gemini:

Update `backend/server.js` to import and use all the extracted modules.

#### 5A: Update Imports Section

**At the top of server.js** (replace existing imports):

```javascript
const express = require('express');
const { supabase } = require('./config/database');
const config = require('./config/environment');
const corsMiddleware = require('./middleware/cors');
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const analysisRoutes = require('./routes/analysis.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
```

#### 5B: Setup Middleware

**After creating app** (replace existing middleware setup):

```javascript
// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Health check (keep this simple route in server.js)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);
```

#### 5C: Clean Up server.js

**Remove from server.js**:
1. All extracted route handlers (they're now in route files)
2. `authenticateToken` function (now in middleware/auth.js)
3. CORS config (now in middleware/cors.js)
4. Supabase initialization (now in config/database.js)
5. Environment variable references (import from config/environment.js)

**Keep in server.js**:
- Auto-analysis cron job (setInterval for 30-min analysis)
- Helper functions like `runAnalysisForUser` (we'll extract these in Phase 3)
- Server startup code (`app.listen`)

#### 5D: Update Auto-Analysis Cron

**Update the setInterval section** to use imported config:

```javascript
const { supabase } = require('./config/database');
const config = require('./config/environment');

// Auto-analysis cron (keep this in server.js for now)
setInterval(async () => {
  console.log('🔄 Running auto-analysis check...');

  const { data: dueUsers } = await supabase
    .from('analysis_schedule')
    .select('user_id')
    .lte('next_analysis_due', new Date().toISOString());

  // ... rest of cron logic
}, 30 * 60 * 1000);
```

### Success Criteria:
- [ ] server.js imports all new modules
- [ ] All routes mounted correctly
- [ ] server.js < 1000 lines (should be way less!)
- [ ] No duplicate code
- [ ] Server starts without errors: `node server.js`
- [ ] Report back: "✅ TASK 5 COMPLETE - Everything wired, server.js now X lines"

---

## 🧪 TASK 6: Verify Everything Works (CLAUDE - FINAL REVIEW)

**Priority**: CRITICAL
**AI**: Claude (expensive - only for final review!)
**Time**: 15 minutes
**Dependencies**: Tasks 1-5 must ALL be complete

### Instructions for User:

**Run Claude with this prompt**:
```
"Phase 2 Tasks 1-5 complete. Please verify:
1. Run: cd backend && node server.js (should start without errors)
2. Run: npm test (all tests should pass)
3. Check: wc -l backend/server.js (should be < 1000 lines, ideally < 500)
4. Test: curl http://localhost:5000/health (should return {\"status\":\"ok\"})
5. Review: Check for any obvious issues

If everything passes, commit with message: 'Phase 2: Modularize backend structure'
"
```

### Success Criteria:
- [ ] Server starts without errors
- [ ] All tests passing
- [ ] server.js < 1000 lines
- [ ] Health check works
- [ ] Changes committed to git
- [ ] Report: "✅ PHASE 2 COMPLETE"

---

## 📊 TASK SUMMARY

| Task | AI | Status | Time Est |
|---|---|---|---|
| 1. Directory Structure | Qwen | ⏳ TODO | 5 min |
| 2. Extract Config | Gemini | ⏳ TODO | 15 min |
| 3. Extract Middleware | Gemini | ⏳ TODO | 20 min |
| 4. Extract Routes | Qwen | ⏳ TODO | 45 min |
| 5. Wire Everything | Gemini | ⏳ TODO | 20 min |
| 6. Verify & Commit | Claude | ⏳ TODO | 15 min |

**Total Estimated Time**: 2 hours
**Total Claude Usage**: 15 minutes (only for final review!)

---

## 🚀 EXECUTION ORDER

**DO TASKS IN THIS EXACT ORDER**:

1. **Qwen**: Task 1 (Directory Structure) - 5 min
2. **Gemini**: Task 2 (Extract Config) - 15 min
3. **Gemini**: Task 3 (Extract Middleware) - 20 min
4. **Qwen**: Task 4 (Extract Routes) - 45 min
5. **Gemini**: Task 5 (Wire Everything) - 20 min
6. **Claude**: Task 6 (Verify & Commit) - 15 min

**IMPORTANT**:
- Don't skip tasks!
- Report completion after each task
- Ask for help if stuck (but try to solve yourself first)
- Only call Claude for TASK 6 (final review)

---

## 💬 COMPLETION REPORTING

After each task, report in this format:

```
✅ TASK X COMPLETE
AI: [Qwen/Gemini/Claude]
Time: [actual time taken]
Files Changed: [list files]
Issues: [any problems encountered]
Next: [next task number]
```

Example:
```
✅ TASK 1 COMPLETE
AI: Qwen
Time: 3 minutes
Files Changed: Created 7 directories in backend/
Issues: None
Next: Task 2 (Gemini - Extract Config)
```

---

**Ready to start? Run Qwen with Task 1 first!**
