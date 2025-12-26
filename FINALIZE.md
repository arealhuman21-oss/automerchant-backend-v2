# 🎯 FINALIZE - Refactoring Roadmap

**Last Updated**: December 25, 2025 10:00 PM
**Current Status**: Phase 1 Complete ✅
**Branch**: `refactor-to-production`

---

## ✅ PHASE 1: COMPLETE - Foundation & Cleanup

**Completed**: December 25, 2025
**Time**: 1 hour
**AI Team**: Claude + Gemini Pro + Qwen

### What We Did:
- ✅ Added Jest testing framework
  - Created `backend/jest.config.js`
  - Created `backend/tests/unit/` structure
  - Migrated V3 algorithm tests (8/8 passing)
- ✅ Cleaned up 140+ debug/test files
  - Removed all root directory test scripts
  - Removed all backend debug scripts
  - Removed 50+ old markdown docs
- ✅ Removed legacy code
  - Deleted `pg` client (Supabase only now)
  - Deleted `analyzeProduct-v2.js` (V3 only)
  - Removed all V2 references from server.js
- ✅ Updated documentation
  - BRAIN.md with AI collaboration workflow
  - Updated .gitignore
  - Created PHASE_1_COMPLETE.md

### Git Commit:
```
Commit: 7c12b9e
Message: "Phase 1: Clean up technical debt"
Files: 91 changed, 14,059 insertions(+), 9,357 deletions(-)
```

### Test Results:
```
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Time:        0.438 s
✅ All passing
```

---

## 📋 PHASE 2: Modularize Backend (1-2 days)

**Goal**: Break server.js (4000+ lines) → Modular architecture

### Tasks:

#### 2.1: Create Directory Structure (QWEN)
Create folder structure:
```
backend/
├── config/
├── middleware/
├── routes/
├── controllers/
├── services/
├── models/
└── utils/
```

#### 2.2: Extract Config (GEMINI)
- Extract Supabase client → `config/database.js`
- Extract env vars → `config/environment.js`

#### 2.3: Extract Middleware (GEMINI)
- Extract `authenticateToken` → `middleware/auth.js`
- Extract CORS config → `middleware/cors.js`
- Extract error handler → `middleware/errorHandler.js`

#### 2.4: Extract Routes (QWEN - Parallel)
- Auth routes → `routes/auth.routes.js`
- Products routes → `routes/products.routes.js`
- Analysis routes → `routes/analysis.routes.js`
- Recommendations routes → `routes/recommendations.routes.js`
- Admin routes → `routes/admin.routes.js`

#### 2.5: Wire Everything (GEMINI)
- Update server.js to import all modules
- Remove old code from server.js
- Test that everything works

#### 2.6: Verify (CLAUDE - Quick Review)
- Run `npm test`
- Verify server.js < 500 lines
- Commit changes

**Success Criteria**:
- [ ] server.js < 500 lines (down from 4000+)
- [ ] All routes in separate files
- [ ] All tests passing
- [ ] Committed to git

---

## 📋 PHASE 3: Extract Controllers & Services (1 day)

**Goal**: Separate business logic from routes

### Tasks:

#### 3.1: Create Controllers (GEMINI)
Extract route handlers from each route file into controllers:
- `controllers/auth.controller.js`
- `controllers/products.controller.js`
- `controllers/analysis.controller.js`
- `controllers/recommendations.controller.js`
- `controllers/admin.controller.js`

#### 3.2: Create Services (GEMINI)
Extract business logic into services:
- `services/shopify.service.js` - Shopify API calls
- `services/analysis.service.js` - runAnalysisForUser
- `services/pricing.service.js` - V3 algorithm wrapper
- `services/cron.service.js` - Scheduled jobs

#### 3.3: Create Models (QWEN)
Extract database queries into models:
- `models/user.model.js`
- `models/product.model.js`
- `models/recommendation.model.js`
- `models/schedule.model.js`

#### 3.4: Verify (CLAUDE - Quick Review)
- Test all endpoints still work
- Run `npm test`
- Commit changes

**Success Criteria**:
- [ ] Routes only call controllers
- [ ] Controllers only call services
- [ ] Services contain all business logic
- [ ] Models handle all database queries
- [ ] All tests passing

---

## 📋 PHASE 4: Security Hardening (1 day)

**Goal**: Eliminate service key, enforce Row-Level Security

### Tasks:

#### 4.1: Create RLS Policies (GEMINI)
- Create migration with RLS policies for all tables
- Users can only access their own data
- Run migration on Supabase

#### 4.2: Replace Service Key (GEMINI)
- Create function that accepts user JWT
- Returns user-scoped Supabase client
- Remove SUPABASE_SERVICE_KEY from code

#### 4.3: Update All Queries (QWEN)
- Find all `supabase.from()` calls
- Update to use user-scoped client
- Test with multiple users

#### 4.4: Security Audit (GEMINI)
- Audit for SQL injection
- Audit for XSS vulnerabilities
- Audit for exposed secrets
- Create SECURITY_AUDIT.md

#### 4.5: Verify (CLAUDE - Security Review)
- Review RLS policies
- Verify no data leaks
- Test multi-user scenarios

**Success Criteria**:
- [ ] RLS policies on all tables
- [ ] No SUPABASE_SERVICE_KEY usage
- [ ] Security audit passed
- [ ] Multi-user testing passed

---

## 📋 PHASE 5: Unified Data Layer (1 day)

**Goal**: Frontend only talks to backend (remove direct Supabase)

### Tasks:

#### 5.1: Find Frontend Supabase Calls (QWEN)
- Search `frontend/src/` for `supabase.from`
- List all files and line numbers

#### 5.2: Create Backend Endpoints (GEMINI)
- For each frontend Supabase call, create backend endpoint
- Document new API endpoints

#### 5.3: Replace Frontend Calls (QWEN)
- Replace `supabase.from()` with `fetch('/api/...')`
- Update all components

#### 5.4: Remove Supabase from Frontend (QWEN)
- Remove `@supabase/supabase-js` from package.json
- Delete `supabaseClient.js`
- Remove all Supabase imports

#### 5.5: Test Integration (CLAUDE - Final Test)
- Test signup flow
- Test OAuth flow
- Test product sync
- Test analysis
- Verify frontend can't access DB directly

**Success Criteria**:
- [ ] Zero direct Supabase calls from frontend
- [ ] All data flows through backend API
- [ ] Supabase client removed from frontend
- [ ] Full user flow works

---

## 📋 PHASE 6: Testing & Documentation (1 day)

**Goal**: 80%+ test coverage, updated docs

### Tasks:

#### 6.1: Create Test Structure (QWEN)
- Create test files for all services
- Create test files for all controllers
- Create test files for all models
- Create integration tests for routes

#### 6.2: Write Unit Tests (GEMINI)
- Test all services (80%+ coverage)
- Test all controllers
- Test all models

#### 6.3: Write Integration Tests (GEMINI)
- Test all routes
- Test happy paths
- Test error cases

#### 6.4: Update Documentation (QWEN)
- Update BRAIN.md with new structure
- Update all file paths
- Create API documentation

#### 6.5: Deploy (CLAUDE - Final Review)
- Review test coverage
- Deploy to Vercel
- Test production
- Create deployment notes

**Success Criteria**:
- [ ] 80%+ test coverage
- [ ] All docs updated
- [ ] Deployed to production
- [ ] Production tested successfully

---

## 📊 OVERALL PROGRESS

| Phase | Status | Duration | AI Lead |
|---|---|---|---|
| Phase 1: Foundation | ✅ DONE | 1 hour | Claude + Gemini + Qwen |
| Phase 2: Modularize | ⏳ TODO | 1-2 days | Qwen + Gemini |
| Phase 3: Extract Logic | ⏳ TODO | 1 day | Gemini + Qwen |
| Phase 4: Security | ⏳ TODO | 1 day | Gemini + Claude (review) |
| Phase 5: Unify Data | ⏳ TODO | 1 day | Qwen + Gemini |
| Phase 6: Testing | ⏳ TODO | 1 day | Gemini + Qwen |

**Estimated Total**: 5-7 days
**Completed**: 1 day (Phase 1)
**Remaining**: 4-6 days

---

## 🎯 Success Metrics

### Before Refactoring ❌
```
server.js:          4000+ lines
Test Coverage:      0%
Architecture:       Monolithic
Security:           Service key (bypasses RLS)
Frontend:           Hybrid (backend + Supabase)
Database Clients:   2 (pg + Supabase)
Technical Debt:     140+ debug files
```

### After Refactoring ✅
```
server.js:          < 200 lines
Test Coverage:      80%+
Architecture:       Modular (MVC pattern)
Security:           RLS enforced (user JWT)
Frontend:           Backend API only
Database Clients:   1 (Supabase)
Technical Debt:     Minimal
```

---

## ⚡ Quick Commands

```bash
# Check current progress
git log --oneline refactor-to-production

# Run tests
cd backend && npm test

# Check file sizes
wc -l backend/server.js

# Deploy
vercel --prod
```

---

**Next Steps**: Start Phase 2 tomorrow using Qwen + Gemini workflow from BRAIN.md!
