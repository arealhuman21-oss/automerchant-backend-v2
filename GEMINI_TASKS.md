# 💎 GEMINI SECURITY TASKS - RUN IN PARALLEL!

**AI:** Gemini Pro (Moderate token usage)
**Priority:** CRITICAL - Security code fixes
**Can run in parallel:** YES (independent of Qwen tasks)
**Estimated Time:** 6-8 hours total (spread over 2-3 days)

---

## ⚡ WHY GEMINI?

You're handling security-sensitive code changes that require careful implementation but not deep architectural decisions. These are important fixes that need attention to detail - perfect for your capabilities!

---

## 🎯 PARALLEL EXECUTION STRATEGY

**You can start these tasks RIGHT NOW** (don't wait for Qwen):

- ✅ G1: Fix HMAC timing attack (independent)
- ✅ G2: Add helmet security headers (independent)
- ✅ G3: Add input validation (independent)
- ✅ G4: Secure cron endpoint (independent)
- ⏸️ G5: Add CSRF protection (wait 1 day - needs testing)

**Start G1-G4 in parallel if you can handle it!**

---

## 🚨 TASK G1: FIX HMAC TIMING ATTACK (30 MIN)

**Priority:** CRITICAL
**File:** `backend/routes/auth.routes.js`
**Risk:** Authentication bypass via timing attack
**Can start:** RIGHT NOW

### The Problem:

Current code at lines 127 and 157:
```javascript
if (generatedHmac !== hmac) {
  return res.status(400).json({ error: 'Invalid HMAC' });
}
```

This uses string comparison which leaks timing information. Attackers can deduce the correct HMAC byte-by-byte.

### The Fix:

**Step 1:** Open `backend/routes/auth.routes.js`

**Step 2:** Add crypto import at top of file (if not already there):
```javascript
const crypto = require('crypto');
```

**Step 3:** Find BOTH occurrences (around lines 127 and 157) and replace:

**OLD CODE:**
```javascript
if (generatedHmac !== hmac) {
  return res.status(400).json({ error: 'Invalid HMAC' });
}
```

**NEW CODE:**
```javascript
// Timing-safe comparison to prevent timing attacks
if (!crypto.timingSafeEqual(
  Buffer.from(generatedHmac),
  Buffer.from(hmac)
)) {
  return res.status(400).json({ error: 'Invalid HMAC' });
}
```

**Step 4:** Verify both locations are updated (search for "!== hmac" - should find 0 results)

**Step 5:** Test the code:
```bash
cd backend
npm test
```

### Commit:
```bash
git add backend/routes/auth.routes.js
git commit -m "🔒 Fix HMAC timing attack vulnerability with crypto.timingSafeEqual"
git push
```

### Report Back:
```
✅ TASK G1 COMPLETE
File: backend/routes/auth.routes.js
Changes: 2 HMAC comparisons now use timing-safe comparison
Lines modified: ~127, ~157
Tests: Passing
Security: Timing attack vulnerability patched
Next: G2 or any other task
```

---

## 🛡️ TASK G2: ADD HELMET SECURITY HEADERS (30 MIN)

**Priority:** HIGH
**File:** `backend/server.js`
**Risk:** XSS, clickjacking, MIME sniffing attacks
**Can start:** RIGHT NOW

### Step 1: Install Helmet

```bash
cd backend
npm install helmet
```

### Step 2: Add to server.js

Open `backend/server.js`

**Add import at top** (after other requires, around line 10):
```javascript
const helmet = require('helmet');
```

**Add middleware** (AFTER CORS setup, BEFORE route definitions, around line 70):
```javascript
// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://mfuqxntaivvqiajfgjtv.supabase.co",
        "https://*.shopify.com"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true // Enable XSS filter
}));
```

### Step 3: Update package.json

Verify `helmet` is in dependencies:
```bash
cat backend/package.json | grep helmet
```

### Step 4: Test

```bash
# Start server locally
node server.js

# In another terminal, check headers
curl -I http://localhost:5000/health

# Should see headers like:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
```

### Step 5: Commit

```bash
git add backend/server.js backend/package.json backend/package-lock.json
git commit -m "🛡️ Add helmet for security headers (CSP, HSTS, frameguard)"
git push
```

### Report Back:
```
✅ TASK G2 COMPLETE
Package installed: helmet@^7.x.x
File modified: backend/server.js
Headers added: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
Tests: Server starts successfully
Verified: curl shows security headers
Next: G3 or any other task
```

---

## ✅ TASK G3: ADD INPUT VALIDATION (2 HOURS)

**Priority:** CRITICAL
**Files:** Multiple routes and controllers
**Risk:** Type confusion, injection attacks, data corruption
**Can start:** RIGHT NOW

### Step 1: Install Joi

```bash
cd backend
npm install joi
```

### Step 2: Create Validation Middleware

Create new file: `backend/middleware/validation.js`

```javascript
const Joi = require('joi');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated/sanitized data
    req[property] = value;
    next();
  };
}

// Common validation schemas
const schemas = {
  // Product validation
  costPrice: Joi.object({
    costPrice: Joi.number()
      .positive()
      .max(1000000)
      .required()
      .messages({
        'number.positive': 'Cost price must be positive',
        'number.max': 'Cost price cannot exceed $1,000,000'
      })
  }),

  // ID validation
  id: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
  }),

  // Email validation
  email: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .required()
  }),

  // Shop domain validation
  shopDomain: Joi.object({
    shop: Joi.string()
      .pattern(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
      .required()
      .messages({
        'string.pattern.base': 'Shop must be a valid .myshopify.com domain'
      })
  }),

  // Product selection
  productSelection: Joi.object({
    selected: Joi.boolean().required()
  })
};

module.exports = { validate, schemas };
```

### Step 3: Apply Validation to Routes

**Update `backend/routes/products.routes.js`:**

Add imports at top:
```javascript
const { validate, schemas } = require('../middleware/validation');
```

Update routes:
```javascript
// POST /api/products/:id/cost-price
router.post(
  '/:id/cost-price',
  authenticateToken,
  validate(schemas.id, 'params'),
  validate(schemas.costPrice, 'body'),
  productsController.updateCostPrice
);

// POST /api/products/:id/select
router.post(
  '/:id/select',
  authenticateToken,
  validate(schemas.id, 'params'),
  validate(schemas.productSelection, 'body'),
  productsController.toggleSelection
);
```

**Update `backend/routes/recommendations.routes.js`:**

Add imports:
```javascript
const { validate, schemas } = require('../middleware/validation');
```

Update routes:
```javascript
// POST /api/recommendations/:id/accept
router.post(
  '/:id/accept',
  authenticateToken,
  validate(schemas.id, 'params'),
  recommendationsController.acceptRecommendation
);

// POST /api/recommendations/:id/reject
router.post(
  '/:id/reject',
  authenticateToken,
  validate(schemas.id, 'params'),
  recommendationsController.rejectRecommendation
);
```

**Update `backend/routes/auth.routes.js`:**

Add imports:
```javascript
const { validate, schemas } = require('../middleware/validation');
```

Update route:
```javascript
// POST /auth/shopify
router.post(
  '/shopify',
  validate(schemas.shopDomain, 'body'),
  validate(schemas.email, 'body'),
  authController.initiateOAuth
);
```

### Step 4: Test Validation

Create test file: `backend/tests/validation.test.js` (optional but recommended)

Or manually test:
```bash
# Test invalid cost price
curl -X POST http://localhost:5000/api/products/1/cost-price \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"costPrice": -100}'

# Should return 400 with error message
```

### Step 5: Commit

```bash
git add backend/middleware/validation.js
git add backend/routes/products.routes.js
git add backend/routes/recommendations.routes.js
git add backend/routes/auth.routes.js
git add backend/package.json backend/package-lock.json
git commit -m "✅ Add comprehensive input validation with Joi"
git push
```

### Report Back:
```
✅ TASK G3 COMPLETE
Package installed: joi@^17.x.x
Files created: backend/middleware/validation.js
Files modified: products.routes.js, recommendations.routes.js, auth.routes.js
Validation added: Cost price, IDs, emails, shop domains
Tests: All routes validate input properly
Security: Type confusion and injection attacks prevented
Next: G4 or G5
```

---

## 🔐 TASK G4: SECURE CRON ENDPOINT (30 MIN)

**Priority:** CRITICAL
**File:** `backend/server.js`
**Risk:** Unauthorized job execution, DoS attacks
**Can start:** RIGHT NOW

### Step 1: Find Cron Endpoint

Open `backend/server.js`, search for `/api/cron/auto-analysis` (around line 774)

### Current Weak Code:

```javascript
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Step 2: Replace with Timing-Safe Comparison

**NEW CODE:**
```javascript
const crypto = require('crypto'); // Add at top if not already there

// ... inside the route handler:

const authHeader = req.headers.authorization;

// Validate header format
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  console.error('❌ Cron auth failed: Invalid header format');
  return res.status(401).json({ error: 'Unauthorized' });
}

// Extract token
const providedSecret = authHeader.slice(7); // Remove 'Bearer '
const cronSecret = process.env.CRON_SECRET;

// Validate secret exists
if (!cronSecret || cronSecret.length < 32) {
  console.error('❌ CRON_SECRET not configured properly');
  return res.status(500).json({ error: 'Server configuration error' });
}

// Timing-safe comparison
try {
  if (!crypto.timingSafeEqual(
    Buffer.from(providedSecret),
    Buffer.from(cronSecret)
  )) {
    console.error('❌ Cron auth failed: Invalid secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }
} catch (err) {
  console.error('❌ Cron auth failed: Comparison error', err);
  return res.status(401).json({ error: 'Unauthorized' });
}

console.log('✅ Cron authentication successful');
// Continue with cron logic...
```

### Step 3: Add Rate Limiting (Optional but Recommended)

Add at the top of the route (before auth check):
```javascript
// Prevent rapid fire abuse (max 1 request per 20 minutes)
const lastCronRun = global.lastCronRun || 0;
const now = Date.now();
const twentyMinutes = 20 * 60 * 1000;

if (now - lastCronRun < twentyMinutes) {
  console.warn('⚠️ Cron called too frequently, rate limited');
  return res.status(429).json({
    error: 'Too many requests',
    nextAllowed: new Date(lastCronRun + twentyMinutes).toISOString()
  });
}

global.lastCronRun = now;
```

### Step 4: Test

```bash
# Test invalid auth
curl -X GET http://localhost:5000/api/cron/auto-analysis \
  -H "Authorization: Bearer wrong_secret"
# Should return 401

# Test valid auth (use your actual CRON_SECRET)
curl -X GET http://localhost:5000/api/cron/auto-analysis \
  -H "Authorization: Bearer your_actual_cron_secret"
# Should work
```

### Step 5: Commit

```bash
git add backend/server.js
git commit -m "🔐 Secure cron endpoint with timing-safe comparison and rate limiting"
git push
```

### Report Back:
```
✅ TASK G4 COMPLETE
File: backend/server.js
Security improvements:
  - Timing-safe HMAC comparison
  - Header format validation
  - Rate limiting (max 1 req/20 min)
  - Better error logging
Tests: Verified with curl
Next: G5 or wait for Claude RLS tasks
```

---

## 🛡️ TASK G5: ADD CSRF PROTECTION (2 HOURS)

**Priority:** HIGH (but needs frontend changes)
**Files:** `backend/server.js`, `frontend/src/lib/api.js`
**Can start:** After G1-G4 complete (Day 2 or 3)
**Note:** This requires frontend changes too!

### Step 1: Install Dependencies

```bash
cd backend
npm install csurf cookie-parser
```

### Step 2: Add to Backend

Open `backend/server.js`

**Add imports** (at top):
```javascript
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
```

**Add cookie parser** (before routes, around line 60):
```javascript
app.use(cookieParser());
```

**Create CSRF protection** (after cookie parser):
```javascript
// CSRF protection for state-changing routes
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});
```

**Add CSRF token endpoint** (with routes):
```javascript
// GET /api/csrf-token - Get CSRF token for forms
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Protect state-changing routes**:
```javascript
// Apply CSRF to dangerous routes
app.use('/api/recommendations/:id/accept', csrfProtection);
app.use('/api/recommendations/:id/reject', csrfProtection);
app.use('/api/products/:id/cost-price', csrfProtection);
app.use('/api/admin/*', csrfProtection);
```

### Step 3: Update Frontend API Client

**IMPORTANT:** This requires frontend changes!

Open `frontend/src/components/ProductDashboard.jsx`

**Add CSRF token fetching**:
```javascript
// At component initialization
const [csrfToken, setCsrfToken] = useState(null);

useEffect(() => {
  // Fetch CSRF token on mount
  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/csrf-token`, {
        credentials: 'include'
      });
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
    }
  };
  fetchCsrfToken();
}, []);

// Update api.call to include CSRF token
const api = {
  async call(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...options.headers
    };
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Important for cookies
    });
    // ... rest
  }
};
```

### Step 4: Test CSRF Protection

```bash
# Without CSRF token (should fail)
curl -X POST http://localhost:5000/api/products/1/cost-price \
  -H "Authorization: Bearer TOKEN" \
  -d '{"costPrice": 50}'
# Should return 403 CSRF error

# With CSRF token (should work)
# First get token:
curl -X GET http://localhost:5000/api/csrf-token \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

# Then use it:
curl -X POST http://localhost:5000/api/products/1/cost-price \
  -H "Authorization: Bearer TOKEN" \
  -H "X-CSRF-Token: TOKEN_FROM_ABOVE" \
  --cookie cookies.txt \
  -d '{"costPrice": 50}'
```

### Step 5: Commit

```bash
git add backend/server.js backend/package.json backend/package-lock.json
git add frontend/src/components/ProductDashboard.jsx
git commit -m "🛡️ Add CSRF protection for state-changing routes"
git push
```

### Report Back:
```
✅ TASK G5 COMPLETE
Packages installed: csurf, cookie-parser
Backend: CSRF protection on all dangerous routes
Frontend: CSRF token fetching and header injection
Tests: Verified CSRF blocks unauthorized requests
Security: CSRF attacks prevented
Note: Requires full testing with frontend
Next: Deploy and test in staging
```

---

## 📊 TASK EXECUTION SUMMARY

| Task | Priority | Time | Can Start | Dependencies |
|------|----------|------|-----------|--------------|
| G1: HMAC fix | CRITICAL | 30 min | NOW | None |
| G2: Helmet | HIGH | 30 min | NOW | None |
| G3: Validation | CRITICAL | 2 hours | NOW | None |
| G4: Cron auth | CRITICAL | 30 min | NOW | None |
| G5: CSRF | HIGH | 2 hours | Day 2-3 | G1-G4 done |

**Total:** 6 hours (can compress to 4 hours if parallel)

---

## ✅ SUCCESS CRITERIA

After all tasks complete:

- [ ] HMAC uses timing-safe comparison
- [ ] Helmet security headers active
- [ ] Input validation on all routes
- [ ] Cron endpoint secured
- [ ] CSRF protection implemented
- [ ] All tests passing
- [ ] Code committed and pushed

---

## 🚀 START COMMANDS

**Run these in parallel if you can:**

```bash
gemini "Execute Task G1 from GEMINI_TASKS.md - Fix HMAC timing attack"

gemini "Execute Task G2 from GEMINI_TASKS.md - Add helmet security headers"

gemini "Execute Task G3 from GEMINI_TASKS.md - Add input validation"

gemini "Execute Task G4 from GEMINI_TASKS.md - Secure cron endpoint"
```

**Then on Day 2:**
```bash
gemini "Execute Task G5 from GEMINI_TASKS.md - Add CSRF protection"
```

---

## 💬 REPORTING TEMPLATE

After each task:

```
✅ TASK G[X] COMPLETE
AI: Gemini Pro
Time: [actual time]
Files changed: [list]
Packages installed: [list]
Tests: [pass/fail]
Security improvement: [description]
Issues: [any problems or "None"]
Next: [what to do next]
```

---

## 🆘 IF YOU GET STUCK

**Problem:** npm install fails
**Solution:** Try `npm install --legacy-peer-deps` or report error

**Problem:** Test fails after changes
**Solution:** Report the exact test failure, don't continue

**Problem:** Unsure about code placement
**Solution:** Ask for clarification with file:line context

---

**Ready?** You're building critical security infrastructure! 💪

**After you finish:** Claude will implement RLS policies and switch to ANON_KEY.

GO! ⚡
