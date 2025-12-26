# 🏗️ AutoMerchant Refactoring Plan - Production-Grade Architecture

**Created**: December 25, 2025
**Priority**: HIGH
**Estimated Time**: 3-5 days with AI assistance

---

## 🎯 Goal

Transform AutoMerchant from a working MVP into a **production-grade, secure, maintainable SaaS** that you'd confidently charge $20/month for.

---

## 📊 Current State Analysis

### ✅ What's Working
- V3 pricing algorithm is excellent (tested ✅)
- Core business logic is sound
- Product is functional and deployed
- Users can sign up and use the system

### ❌ Critical Issues

1. **Monolithic Backend** (4000+ lines in `server.js`)
   - Impossible to test individual features
   - High risk of breaking changes
   - Difficult to debug
   - Can't scale team (no one can understand it)

2. **Security Vulnerability** 🚨
   - Using `SUPABASE_SERVICE_KEY` bypasses Row-Level Security
   - One backend bug = entire database exposed
   - No defense in depth

3. **Hybrid Architecture Chaos**
   - Frontend → Backend (some data)
   - Frontend → Supabase (other data)
   - No single source of truth
   - Impossible to reason about data flow

4. **Technical Debt**
   - 100+ debug/test scripts cluttering repo
   - Old `pg` client + new Supabase client (redundant)
   - Multiple algorithm versions (V2, V3)
   - No automated tests

---

## 🏗️ Target Architecture

### **Option A: Backend-First (Recommended)** ⭐

```
Frontend (React)
    ↓ (All requests go here)
Backend (Express)
    ↓ (Uses user's JWT)
Supabase (PostgreSQL + Auth)
    ↓ (RLS enforced)
Data (Secure)
```

**Benefits**:
- ✅ Single source of truth (backend)
- ✅ Row-Level Security enforced
- ✅ Easy to test business logic
- ✅ Can add caching, rate limiting, etc.
- ✅ Frontend is dumb (just renders UI)

### **Option B: Supabase-First (BaaS)**

```
Frontend (React)
    ↓ (Direct database access)
Supabase (PostgreSQL + Auth + Edge Functions)
    ↓ (RLS enforced)
Data (Secure)
```

**Benefits**:
- ✅ Simpler architecture
- ✅ Built-in realtime
- ✅ Less code to maintain
- ❌ Complex business logic in Edge Functions (harder to test)
- ❌ Vendor lock-in to Supabase

**Recommendation**: **Option A** - You have complex business logic (V3 algorithm) that needs proper testing.

---

## 📋 Refactoring Roadmap

### **Phase 1: Foundation (Day 1)** 🏗️

**Goal**: Set up testing infrastructure and clean up

**Tasks**:
1. ✅ Add Jest testing framework
2. ✅ Create test suite for V3 algorithm (DONE - we have this!)
3. ✅ Delete all debug/test scripts from root
4. ✅ Remove old `pg` client from dependencies
5. ✅ Remove algorithm V2 code

**Deliverable**: Clean codebase with working tests

---

### **Phase 2: Modular Backend (Day 2-3)** 🔨

**Goal**: Break `server.js` into manageable modules

**New Structure**:
```
backend/
├── server.js                  (200 lines - just setup)
├── config/
│   ├── database.js           (Supabase client)
│   └── environment.js        (env vars)
├── middleware/
│   ├── auth.js               (authenticateToken)
│   ├── cors.js               (CORS config)
│   └── errorHandler.js       (global error handling)
├── routes/
│   ├── auth.routes.js        (login, OAuth)
│   ├── products.routes.js    (CRUD, sync)
│   ├── analysis.routes.js    (manual, auto, status)
│   ├── recommendations.routes.js
│   └── admin.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── products.controller.js
│   ├── analysis.controller.js
│   ├── recommendations.controller.js
│   └── admin.controller.js
├── services/
│   ├── shopify.service.js    (Shopify API calls)
│   ├── analysis.service.js   (runAnalysisForUser)
│   ├── pricing.service.js    (V3 algorithm wrapper)
│   └── cron.service.js       (scheduled jobs)
├── models/
│   ├── user.model.js         (database queries)
│   ├── product.model.js
│   ├── recommendation.model.js
│   └── schedule.model.js
├── utils/
│   ├── logger.js
│   └── validators.js
├── algorithms/
│   └── v3/
│       ├── index.js          (main export)
│       ├── elasticity.js
│       ├── regret.js
│       └── dos.js
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Tasks**:
1. Create folder structure
2. Extract routes from `server.js`
3. Extract controllers (business logic)
4. Extract services (external APIs, complex operations)
5. Extract models (database queries)
6. Wire everything together in `server.js`
7. Test that everything still works

**Deliverable**: Modular, maintainable backend

---

### **Phase 3: Security Hardening (Day 4)** 🔒

**Goal**: Eliminate service key, enforce RLS

**Current Flow** (INSECURE):
```javascript
// Backend
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId);  // ❌ Trusting application code
```

**New Flow** (SECURE):
```javascript
// Backend - create Supabase client with user's JWT
function getSupabaseClient(userJwt) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,  // ✅ Not service key!
    {
      global: {
        headers: {
          Authorization: `Bearer ${userJwt}`
        }
      }
    }
  );
}

// Now RLS is enforced automatically
const supabase = getSupabaseClient(req.user.jwt);
const { data } = await supabase
  .from('products')
  .select('*');  // ✅ RLS filters by authenticated user
```

**Tasks**:
1. Create RLS policies in Supabase
2. Replace all service key calls with user JWT
3. Update frontend to pass JWT to backend
4. Remove `SUPABASE_SERVICE_KEY` from env
5. Test that users can only see their own data

**Deliverable**: Secure, RLS-enforced data access

---

### **Phase 4: Unified Data Layer (Day 5)** 🔄

**Goal**: Frontend only talks to backend (no direct Supabase)

**Current** (CHAOTIC):
```javascript
// Frontend - some calls go to backend
const response = await fetch('/api/products');

// Frontend - other calls go to Supabase directly
const { data } = await supabase.from('products').select('*');
```

**New** (CLEAN):
```javascript
// Frontend - EVERYTHING goes through backend API
const response = await fetch('/api/products');
const response2 = await fetch('/api/recommendations');
const response3 = await fetch('/api/analysis/status');
```

**Tasks**:
1. Remove Supabase client from frontend
2. Create backend endpoints for all data needs
3. Update frontend to use only API calls
4. Remove `REACT_APP_SUPABASE_*` from frontend env

**Deliverable**: Single source of truth (backend API)

---

### **Phase 5: Testing & Documentation (Ongoing)** 📝

**Goal**: 80% test coverage, updated docs

**Tasks**:
1. Unit tests for all services
2. Integration tests for API endpoints
3. E2E tests for critical user flows
4. Update BRAIN.md with new architecture
5. Create API documentation

**Deliverable**: Tested, documented codebase

---

## 🚀 Execution Strategy

### **With AI Assistance** (Recommended)

**You (Human)**:
- Make architectural decisions
- Review code changes
- Test functionality
- Deploy to production

**Claude (Me)**:
- Plan refactoring steps
- Write modular code
- Create tests
- Update documentation

**Gemini Pro**:
- Review security
- Suggest optimizations
- Cross-check Claude's work

**Qwen Code**:
- Help with repetitive tasks
- Generate boilerplate

### **Incremental Approach** ⚡

**DON'T**: Try to do everything at once
**DO**: Ship working code every day

**Day 1**: Clean up + tests
**Day 2**: Extract routes + controllers
**Day 3**: Extract services + models
**Day 4**: Security hardening
**Day 5**: Frontend unification

After each day, deploy and verify!

---

## 💰 Why This Matters

### **Before Refactoring** ❌
- Can't confidently charge $20/month (too fragile)
- Every new feature risks breaking everything
- Can't onboard new developers
- Security vulnerability waiting to happen

### **After Refactoring** ✅
- Production-grade architecture
- Testable, maintainable code
- Secure by default (RLS enforced)
- Can scale team and features
- **Confidently charge $20-50/month**

---

## 🎯 Success Metrics

After refactoring, you should have:

1. ✅ `server.js` < 500 lines
2. ✅ No `SUPABASE_SERVICE_KEY` in backend
3. ✅ 80%+ test coverage
4. ✅ Zero direct Supabase calls from frontend
5. ✅ All RLS policies enforced
6. ✅ All debug scripts deleted
7. ✅ Single `pg` OR Supabase client (not both)

---

## 🤔 Should We Start NOW?

**My Recommendation**: **YES, but strategically**

### **Tonight** (1 hour):
1. ✅ Fix Gemini CLI (done)
2. Create Git branch: `git checkout -b refactor-to-production`
3. Phase 1: Clean up + add tests (quick win)

### **This Week** (3-5 days):
4. Phase 2-5 with AI help

### **Why Now?**
- You're already thinking about it
- Every day you wait = more technical debt
- Before you get more users (easier to refactor now)
- You have AI assistance (me, Gemini, Qwen)

---

## ❓ Decision Time

**Option 1**: Start tonight with Phase 1 (cleanup + tests) ⚡
**Option 2**: Plan more, start tomorrow
**Option 3**: Ship features first, refactor later (risky!)

**What do you want to do?** I'm ready to help! 🚀

---

**Last Updated**: December 25, 2025
**Status**: AWAITING YOUR DECISION
