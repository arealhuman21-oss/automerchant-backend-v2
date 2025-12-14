# Critical Security Fixes Required Before Customer Onboarding

## Overview

Based on the Codex security audit, there are several CRITICAL vulnerabilities that must be fixed before onboarding paying customers. This document outlines each issue, its severity, and the fix implementation.

---

## 🔴 CRITICAL Issues (Fix Immediately)

### 1. Admin Authentication Bypass Vulnerability

**Location:** `backend/server.js:2581-2635`

**Vulnerability:**
The `authenticateAdmin` function uses `jwt.decode()` (line 2613) which DOES NOT verify the JWT signature. An attacker can create a fake JWT with `{ email: "arealhuman21@gmail.com" }` and bypass authentication.

**Attack Vector:**
```javascript
// Attacker can create this unsigned token:
const fakeToken = btoa(JSON.stringify({
  header: { alg: "none" },
  payload: { email: "arealhuman21@gmail.com" }
}));

// Send to any admin endpoint → FULL ACCESS GRANTED
```

**Current Code:**
```javascript
// Line 2613 - VULNERABLE
const decoded = jwt.decode(token); // No signature verification!

if (decoded.email.toLowerCase() === 'arealhuman21@gmail.com') {
  req.user = decoded;
  next(); // ADMIN ACCESS GRANTED
}
```

**Fix:**
```javascript
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // ALWAYS verify signature with JWT_SECRET
    const verified = jwt.verify(token, JWT_SECRET);

    // Check if user is admin email
    if (!verified.email || verified.email.toLowerCase() !== 'arealhuman21@gmail.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check for admin role claim (better approach)
    if (verified.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = verified;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

**Impact if not fixed:**
- ❌ Complete admin panel takeover
- ❌ Attacker can approve/suspend users
- ❌ Attacker can view all customer data
- ❌ Attacker can modify Shopify app configurations

---

### 2. Secrets Committed to Repository

**Location:** `backend/.env` (committed to git)

**Vulnerability:**
The `.env` file contains:
- `SUPABASE_SERVICE_KEY` (full database access)
- `JWT_SECRET` (can forge any user token)
- `DATABASE_URL` with password

**Current State:**
```bash
# backend/.env - COMMITTED TO GIT
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=automerchant_production_secret_key_2024_secure_random_string
DATABASE_URL=postgresql://postgres.mfuqxntaivvqiajfgjtv:Aatiaday2018!@...
```

**Fix Steps:**

1. **Immediately rotate all secrets:**
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Regenerate Supabase service key in Supabase Dashboard:
# Settings → API → Service Role Key → Reset
```

2. **Remove .env from git history:**
```bash
git rm --cached backend/.env
echo "backend/.env" >> .gitignore
git add .gitignore
git commit -m "Remove sensitive .env file"
```

3. **Set environment variables in Vercel:**
```bash
# In Vercel Dashboard → Project Settings → Environment Variables
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=... (NEW rotated key)
JWT_SECRET=... (NEW generated secret)
DATABASE_URL=... (with NEW password)
```

4. **Create .env.example template:**
```bash
# backend/.env.example (safe to commit)
SUPABASE_URL=https://your-project.supabase.co
DATABASE_URL=postgresql://postgres...
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=production
AUTH_MODE=oauth
```

**Impact if not fixed:**
- ❌ Anyone with repo access has full database control
- ❌ Can forge tokens for any user
- ❌ Can read/modify all customer data
- ❌ Keys may be exposed in commit history forever

---

### 3. CORS Allows All Origins

**Location:** `backend/server.js:111, 137`

**Vulnerability:**
```javascript
// Line 111 - Allows ALL origins
callback(null, true); // Allow all for now during development

// Line 137 - Sets any origin as allowed
res.setHeader('Access-Control-Allow-Origin', origin);
```

**Attack Vector:**
Any malicious website can make authenticated requests to your API and steal user data.

**Fix:**
```javascript
// Remove the "allow all" fallback
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://automerchant.ai',
      'https://www.automerchant.ai',
      'https://automerchant.vercel.app',
      'https://www.automerchant.vercel.app'
    ];

    // STRICT: Only allow whitelisted origins
    if (!origin) {
      // Allow non-browser clients (like curl, Postman)
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Update manual CORS handler
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://automerchant.vercel.app',
    'https://www.automerchant.vercel.app',
    'https://automerchant.ai',
    'https://www.automerchant.ai',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  // STRICT: Only set CORS headers for allowed origins
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // No origin (non-browser request)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // REJECT unknown origins
    console.warn('⛔ Blocked CORS request from:', origin);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});
```

**Impact if not fixed:**
- ❌ Any website can make requests to your API
- ❌ CSRF attacks possible
- ❌ User tokens can be stolen via malicious sites

---

### 4. Rate Limiting Completely Disabled

**Location:** `backend/server.js:24-25`

**Vulnerability:**
```javascript
const analysisLimiter = (req, res, next) => next(); // NO-OP
const authLimiter = (req, res, next) => next(); // NO-OP
```

Auth endpoints have NO rate limiting → brute force attacks are trivial.

**Fix:**

1. **Install express-rate-limit:**
```bash
cd backend
npm install express-rate-limit
```

2. **Implement rate limiters:**
```javascript
const rateLimit = require('express-rate-limit');

// Auth endpoints: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Analysis endpoint: 10 manual runs per 24 hours per user
const analysisLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 requests per window
  message: {
    error: 'Daily limit reached. You can run 10 manual analyses per 24 hours.'
  },
  keyGenerator: (req) => {
    // Rate limit by user ID, not IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Shopify connect: 3 attempts per hour per IP
const shopifyConnectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many Shopify connection attempts. Please try again later.'
  }
});
```

3. **Apply to endpoints:**
```javascript
app.post('/api/login', authLimiter, async (req, res) => { ... });
app.post('/api/register', authLimiter, async (req, res) => { ... });
app.post('/api/analyze', analysisLimiter, authenticateToken, async (req, res) => { ... });
app.post('/api/shopify/connect', shopifyConnectLimiter, async (req, res) => { ... });
```

**Impact if not fixed:**
- ❌ Brute force password attacks
- ❌ DoS via unlimited analysis requests
- ❌ API abuse with no consequences

---

## 🟡 HIGH Priority Issues

### 5. Shopify Access Tokens Stored in Plaintext

**Location:** `backend/server.js:671, 2638`

**Vulnerability:**
Shopify access tokens are stored unencrypted in the `shops` table. A database breach would expose all merchant stores.

**Fix Options:**

**Option 1: Encrypt at rest using crypto (Quick Fix)**
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte hex string
const ALGORITHM = 'aes-256-gcm';

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedData) {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// When storing:
const encryptedToken = encryptToken(shopifyAccessToken);
await supabase.from('shops').insert({ access_token: encryptedToken });

// When retrieving:
const { data: shop } = await supabase.from('shops').select('access_token').single();
const actualToken = decryptToken(shop.access_token);
```

**Option 2: Use Supabase Vault (Better)**
Store sensitive tokens in Supabase Vault with encryption keys managed by Supabase.

**Impact if not fixed:**
- ⚠️ Database breach exposes all merchant stores
- ⚠️ Attacker can modify customer products/prices
- ⚠️ Compliance issues (PCI, SOC 2)

---

### 6. Token Storage Brittle (localStorage, 7-day expiry, no refresh)

**Location:** Frontend files (localStorage usage)

**Issues:**
- JWT stored in localStorage (vulnerable to XSS)
- 7-day expiry with no refresh mechanism
- No logout on token expiry
- No CSRF protection

**Fix:**

1. **Use httpOnly cookies instead of localStorage:**
```javascript
// Backend: Set cookie instead of returning token
app.post('/api/login', async (req, res) => {
  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });

  res.cookie('authToken', token, {
    httpOnly: true, // Can't be accessed by JS
    secure: true, // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000 // 1 hour
  });

  res.json({ success: true });
});
```

2. **Implement refresh tokens:**
```javascript
// Short-lived access token (1 hour) + long-lived refresh token (7 days)
const accessToken = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });
const refreshToken = jwt.sign({ id }, REFRESH_SECRET, { expiresIn: '7d' });

// Store refresh token in database
await supabase.from('refresh_tokens').insert({
  user_id: id,
  token: refreshToken,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

3. **Add token refresh endpoint:**
```javascript
app.post('/api/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  const verified = jwt.verify(refreshToken, REFRESH_SECRET);

  // Check if refresh token is in database and not revoked
  const { data } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', refreshToken)
    .eq('user_id', verified.id)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!data) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Issue new access token
  const newAccessToken = jwt.sign({ id: verified.id, email: data.email }, JWT_SECRET, { expiresIn: '1h' });

  res.cookie('authToken', newAccessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000
  });

  res.json({ success: true });
});
```

**Impact if not fixed:**
- ⚠️ Tokens vulnerable to XSS attacks
- ⚠️ No way to revoke compromised tokens
- ⚠️ CSRF attacks possible

---

## 🟢 MEDIUM Priority Issues

### 7. No Automated Tests or CI

**Impact:**
- Changes deployed without validation
- Regressions can break production
- No confidence in deployments

**Fix:**
1. Add basic smoke tests
2. Set up GitHub Actions CI
3. Add pre-commit hooks

---

### 8. Single 100k+ Line Backend File

**Impact:**
- Hard to maintain
- Code review difficult
- Merge conflicts common

**Fix:**
- Refactor into separate route files
- Extract business logic to services
- Use MVC pattern

---

## Implementation Priority

### Phase 1: Block Customer Onboarding (Do NOW)
1. ✅ Fix AI Profit Increase calculation (DONE)
2. ⬜ Fix admin auth bypass (CRITICAL)
3. ⬜ Rotate and remove committed secrets (CRITICAL)
4. ⬜ Fix CORS to block unknown origins (CRITICAL)
5. ⬜ Enable rate limiting on auth endpoints (CRITICAL)

### Phase 2: Before First Paying Customer
6. ⬜ Encrypt Shopify tokens at rest
7. ⬜ Implement httpOnly cookies + refresh tokens
8. ⬜ Add basic automated tests

### Phase 3: Before Scale
9. ⬜ Refactor monolithic backend
10. ⬜ Set up CI/CD pipeline
11. ⬜ Add monitoring/alerting

---

## Testing the Fixes

### Test Admin Auth:
```bash
# Should FAIL with invalid signature
curl -X GET https://automerchant-backend-v2.vercel.app/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJlbWFpbCI6ImFyZWFsaHVtYW4yMUBnbWFpbC5jb20ifQ."

# Should succeed with valid token
curl -X GET https://automerchant-backend-v2.vercel.app/api/admin/users \
  -H "Authorization: Bearer <valid_jwt_token>"
```

### Test CORS:
```bash
# Should be blocked
curl -X GET https://automerchant-backend-v2.vercel.app/api/products \
  -H "Origin: https://evil-site.com" \
  -H "Authorization: Bearer <token>"
```

### Test Rate Limiting:
```bash
# Attempt 6 logins in a row - 6th should fail
for i in {1..6}; do
  curl -X POST https://automerchant-backend-v2.vercel.app/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}';
done
```

---

## Ready for Customer Onboarding?

**Current Status:** ❌ NOT READY

**Blocker Issues:**
- ❌ Admin auth bypass (anyone can become admin)
- ❌ Secrets in git (database fully compromised)
- ❌ CORS allows all (any site can steal data)
- ❌ No rate limiting (brute force attacks trivial)

**After Phase 1 Fixes:** ✅ READY for limited beta

**Recommendation:**
Complete Phase 1 fixes (estimated 2-4 hours), then you can safely onboard customers.
