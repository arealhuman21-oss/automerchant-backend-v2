# 🔒 SECURITY FIX DELEGATION PLAN

**Created:** December 27, 2025
**Priority:** CRITICAL - BLOCKING PRODUCTION
**Estimated Time:** 3-5 days
**AI Team:** Claude (planning + critical decisions) + Gemini (coding) + Qwen (grunt work)

---

## 🚨 CRITICAL CONTEXT

**Security Audit Found:**
- 🔴 5 CRITICAL issues (must fix before launch)
- 🟠 5 HIGH issues (fix within 1 week)
- 🟡 5 MEDIUM issues (fix before scaling)

**Most Severe:** `.env` file with all production secrets is in git history!

---

## 📋 TASK BREAKDOWN BY AI

### 🤖 TASKS FOR QWEN (30 min total - FREE TOKENS!)

**Why Qwen:** Simple file operations, no critical thinking needed

#### TASK Q1: Fix .env Git Exposure (URGENT - Do First!)
```bash
qwen "Emergency git cleanup task:

STEP 1: Remove .env from git tracking
cd C:/Users/ben_l/automerchant-local
git rm --cached backend/.env
git commit -m 'Remove exposed .env from version control'

STEP 2: Fix .gitignore
Add these lines to backend/.gitignore:
.env
.env.*
!.env.example

STEP 3: Report back
Show me:
- git status
- contents of .gitignore
- confirmation that .env is no longer tracked
"
```

#### TASK Q2: Clean Up Console.logs (Low Priority)
```bash
qwen "Find and reduce console.log statements in backend:

1. Search for console.log in backend/ (excluding node_modules)
2. Keep error logging (console.error)
3. Remove verbose debug logs like:
   - console.log('Raw data:', ...)
   - console.log('Analyzing product:', ...)
4. Replace with proper log levels if needed

Report how many you removed."
```

---

### 💎 TASKS FOR GEMINI (2-3 days - MODERATE TOKENS)

**Why Gemini:** Security-sensitive code changes that need careful implementation

#### TASK G1: Add Input Validation (HIGH PRIORITY)
```bash
gemini "Add input validation to AutoMerchant backend:

STEP 1: Install validation library
cd backend
npm install joi

STEP 2: Create validation middleware
Create file: backend/middleware/validation.js

Implement validators for:
- Cost price (positive number, max 1000000)
- Product ID (integer)
- Recommendation ID (integer)
- Email (valid email format)
- Shop domain (.myshopify.com)

STEP 3: Apply to routes
Update these files:
- routes/products.routes.js
- routes/recommendations.routes.js
- routes/admin.routes.js

STEP 4: Test
Run: npm test
Report any failures."
```

#### TASK G2: Fix HMAC Timing Attack (CRITICAL)
```bash
gemini "Fix timing attack vulnerability in HMAC verification:

FILE: backend/routes/auth.routes.js

FIND (line ~127 and ~157):
if (generatedHmac !== hmac) {
  return res.status(400).json({ error: 'Invalid HMAC' });
}

REPLACE WITH:
const crypto = require('crypto');

if (!crypto.timingSafeEqual(
  Buffer.from(generatedHmac),
  Buffer.from(hmac)
)) {
  return res.status(400).json({ error: 'Invalid HMAC' });
}

Test the Shopify OAuth flow after changes."
```

#### TASK G3: Add Security Headers with Helmet
```bash
gemini "Add helmet for security headers:

STEP 1: Install
cd backend
npm install helmet

STEP 2: Configure
Add to backend/server.js (after CORS, before routes):

const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [\"'self'\"],
      styleSrc: [\"'self'\", \"'unsafe-inline'\"],
      scriptSrc: [\"'self'\"],
      imgSrc: [\"'self'\", \"data:\", \"https:\"],
      connectSrc: [
        \"'self'\",
        \"https://mfuqxntaivvqiajfgjtv.supabase.co\"
      ]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

STEP 3: Test
curl -I https://automerchant-backend-v2.vercel.app/health
Check for X-Frame-Options, X-Content-Type-Options headers."
```

#### TASK G4: Add CSRF Protection
```bash
gemini "Add CSRF protection:

STEP 1: Install
npm install csurf cookie-parser

STEP 2: Configure
Add to backend/server.js:

const cookieParser = require('cookie-parser');
const csrf = require('csurf');

app.use(cookieParser());

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

STEP 3: Apply to state-changing routes
app.use('/api/recommendations', csrfProtection);
app.use('/api/products/:id/cost-price', csrfProtection);
app.use('/api/admin', csrfProtection);

STEP 4: Add token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

STEP 5: Update frontend to fetch and send CSRF token"
```

#### TASK G5: Fix Cron Authentication
```bash
gemini "Secure the cron endpoint:

FILE: backend/server.js (line ~774)

CURRENT (WEAK):
const authHeader = req.headers.authorization;
if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
  return res.status(401).json({ error: 'Unauthorized' });
}

REPLACE WITH (timing-safe):
const crypto = require('crypto');

const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const providedSecret = authHeader.slice(7); // Remove 'Bearer '
const cronSecret = process.env.CRON_SECRET;

if (!crypto.timingSafeEqual(
  Buffer.from(providedSecret),
  Buffer.from(cronSecret)
)) {
  return res.status(401).json({ error: 'Unauthorized' });
}

Add rate limiting to this endpoint (max 1 req per 20 min)."
```

---

### 🧠 TASKS FOR CLAUDE (Me - 4 hours - CRITICAL ONLY!)

**Why Claude:** Critical architecture decisions, security review, RLS implementation

#### TASK C1: Create RLS Migration (CRITICAL)
I'll create the Row Level Security policies that enforce data isolation at the database level.

#### TASK C2: Switch to ANON_KEY (CRITICAL)
I'll update the database config to use ANON_KEY instead of SERVICE_KEY and ensure RLS policies are enforced.

#### TASK C3: Fix Authorization Checks (CRITICAL)
I'll review and fix all endpoints to use atomic queries that prevent privilege escalation.

#### TASK C4: Final Security Review (CRITICAL)
I'll verify all fixes are implemented correctly and run security tests.

---

## 📊 EXECUTION ORDER

### 🚨 IMMEDIATE (TODAY - 2 hours)

**Do in this exact order:**

1. **QWEN** → Task Q1: Fix .env git exposure (15 min)
2. **MANUAL** → Rotate all secrets in Vercel dashboard (30 min):
   - Generate new database password
   - Generate new Supabase service key
   - Generate new JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - Generate new CRON_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Update all env vars in Vercel
3. **MANUAL** → Set NODE_ENV=production in Vercel (2 min)

### ⚡ DAY 1 (3-4 hours)

4. **GEMINI** → Task G2: Fix HMAC timing attack (30 min)
5. **GEMINI** → Task G3: Add helmet (30 min)
6. **GEMINI** → Task G5: Fix cron auth (30 min)
7. **GEMINI** → Task G1: Add input validation (2 hours)

### ⚡ DAY 2 (4 hours)

8. **CLAUDE** → Task C1: Create RLS migration (2 hours)
9. **CLAUDE** → Task C2: Switch to ANON_KEY (1 hour)
10. **CLAUDE** → Task C3: Fix authorization checks (1 hour)

### ⚡ DAY 3 (3 hours)

11. **GEMINI** → Task G4: Add CSRF protection (2 hours)
12. **CLAUDE** → Task C4: Final security review (1 hour)
13. **Deploy to production** (via Vercel)

### 🧹 DAY 4 (OPTIONAL - 1 hour)

14. **QWEN** → Task Q2: Clean up console.logs (30 min)
15. **Test in production** (30 min)

---

## ✅ SUCCESS CRITERIA

After all tasks complete:

- [ ] .env removed from git history
- [ ] All secrets rotated
- [ ] NODE_ENV=production
- [ ] Input validation on all endpoints
- [ ] HMAC timing-safe comparison
- [ ] Helmet security headers
- [ ] CSRF protection
- [ ] RLS policies enforced
- [ ] ANON_KEY used (not SERVICE_KEY)
- [ ] Authorization checks atomic
- [ ] Cron endpoint secured
- [ ] All tests passing
- [ ] Security audit passes

---

## 🎯 DELEGATION STRATEGY

**Token Usage Breakdown:**
- Qwen: 45 min work, 0 tokens (FREE!)
- Gemini: 2-3 days work, moderate tokens
- Claude: 4 hours work, minimal tokens (only critical decisions)

**Total Savings:** ~80% token reduction vs Claude doing everything!

---

## 📞 COMMUNICATION PROTOCOL

After each task, AI should report:

```
✅ TASK [ID] COMPLETE
AI: [Qwen/Gemini/Claude]
Time: [actual time]
Files: [files changed]
Issues: [any problems]
Next: [what to do next]
```

---

## 🚀 READY TO START?

**First command to run:**

```bash
qwen "Emergency git cleanup - Task Q1 from SECURITY_FIX_PLAN.md"
```

Then manually rotate secrets in Vercel dashboard.

After that, start Gemini tasks in parallel!

---

**Created by:** Claude Sonnet 4.5
**Status:** Ready for execution
**Estimated Completion:** 3-4 days
