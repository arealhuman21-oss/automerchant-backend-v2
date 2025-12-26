# 🤖 AI Delegation Tasks - Phase 1 Cleanup

**Phase**: 1 - Foundation & Cleanup
**Date**: December 25, 2025

---

## 🔵 TASK 1: QWEN CLI - Delete Debug Scripts

**Assigned to**: Qwen CLI (Free Tier)
**Priority**: HIGH
**Estimated Time**: 10 minutes

### Task Description
Delete all test/debug scripts from the root directory and `backend/` directory that are no longer needed.

### Files to DELETE:
```
Root directory (./*.js, ./*.sql, ./*.md except essential ones):
- check-app-16.js
- debug_tc36.js
- final_validation_report.js
- fix_algorithm.js
- test-admin-endpoint.js
- get-install-link.js
- pricing_algorithm_tests.js
- test_runner.js
- generate_*.js (all 3 files)
- run_*.js (all 5 files)
- ALL .json test files (STRESS_TEST_*.json, etc.)
- ALL SQL files in root (ADD_*.sql, CREATE_*.sql, FIX_*.sql)

Backend directory (backend/*.js debug scripts):
- backend/add-app-id-column.js
- backend/check-*.js (all of them - about 12 files)
- backend/debug-*.js (all of them)
- backend/diagnose-*.js (all of them)
- backend/fix-*.js (all of them)
- backend/force-sync-products.js
- backend/generate-install-link.js
- backend/manually-connect-user.js
- backend/onboard-customer.js (keep migrations folder!)
- backend/reset-*.js (all of them)
- backend/test-*.js (all of them - about 15 files)
- backend/trigger-analysis.js
- backend/update-app-credentials.js
- backend/verify-*.js (all of them)
- backend/*.sql (except in migrations folder)
- backend/.env.* (except .env and .env.example)
- backend/server.js.backup-pg-pool
- backend/nul

Documentation to DELETE (keep BRAIN.md, REFACTORING_PLAN.md, CRON_SETUP_VERIFIED.md):
- ALL other .md files in root (there are 50+ of them)
```

### Command for Qwen:
```bash
cd C:\Users\ben_l\automerchant-local

# Run Qwen with this prompt:
qwen "Delete all debug/test scripts and temporary files from this project.
Keep only:
- BRAIN.md
- REFACTORING_PLAN.md
- CRON_SETUP_VERIFIED.md
- .gitignore
- package.json files
- All source code (server.js, components, etc.)
- backend/migrations/ folder (keep all migrations)
- backend/.env.example
- All node_modules

Delete everything else that looks like debug scripts, test files, temporary SQL files, or old documentation."
```

**Verification**:
```bash
# After Qwen runs, check:
git status
# Should see lots of deletions
```

---

## 🟢 TASK 2: GEMINI CLI - Remove 'pg' Client Safely

**Assigned to**: Gemini Pro CLI (Paid Tier)
**Priority**: HIGH
**Estimated Time**: 15 minutes

### Task Description
The backend currently has BOTH `pg` (legacy PostgreSQL client) and `@supabase/supabase-js` (current client). We need to:
1. Find all uses of `pg` in server.js
2. Verify they're all replaced with Supabase client
3. Remove `pg` from package.json dependencies

### Command for Gemini:
```bash
cd C:\Users\ben_l\automerchant-local\backend

# Run Gemini with this prompt:
gemini "Audit server.js for any remaining uses of the 'pg' PostgreSQL client.
We've migrated to @supabase/supabase-js, so 'pg' should no longer be used.

Tasks:
1. Search for any 'pg' imports (require('pg'))
2. Search for 'Pool' or 'Client' from pg
3. Check if any database queries use pg instead of supabase
4. If no pg usage found, remove 'pg' from package.json dependencies
5. Show me what you found and your recommendation

Be thorough - we can't remove pg if it's still being used anywhere."
```

**Expected Output**: Gemini should tell you if it's safe to remove `pg` from package.json.
**Status**: COMPLETED

---

## 🔵 TASK 3: QWEN CLI - Find and Document Algorithm V2

**Assigned to**: Qwen CLI (Free Tier)
**Priority**: MEDIUM
**Estimated Time**: 5 minutes

### Task Description
Find any references to Algorithm V2 code that can be removed (we only use V3 now).

### Files to Check:
- `backend/analyzeProduct-v2.js` (if exists, DELETE IT)
- `server.js` - search for "V2", "algorithm_v2", "analyzeProductV2"

### Command for Qwen:
```bash
cd C:\Users\ben_l\automerchant-local

# Run Qwen:
qwen "Find all references to pricing algorithm V2 in this codebase.
We only use V3 now, so V2 code can be deleted.

Search for:
- analyzeProduct-v2.js
- Any imports or requires of V2
- Environment variables like USE_ALGORITHM_V2
- Any V2 function calls

List what you find so we can safely delete it."
```

---

## ✅ TASK 4: ME (Claude) - Create Proper Test File

**Assigned to**: Claude (Me)
**Priority**: HIGH
**Status**: IN PROGRESS

### Task Description
Convert `test-v3-algorithm.js` into a proper Jest test file that can run with `npm test`.

**Status**: Moving file now...

---

## 📊 Completion Checklist

After all AIs finish their tasks:

- [ ] Qwen: Debug scripts deleted (verify with `git status`)
- [ ] Gemini: `pg` client removed from package.json (if safe)
- [ ] Qwen: V2 algorithm code deleted
- [ ] Claude: Test file properly set up
- [ ] Run: `npm test` to verify tests pass
- [ ] Commit: `git add . && git commit -m "Phase 1: Clean up technical debt"`

---

## 🚀 How to Run These Tasks

**In your terminal**:

```powershell
# Task 1 - Qwen cleanup
qwen "<paste the prompt from TASK 1>"

# Task 2 - Gemini pg audit
gemini "<paste the prompt from TASK 2>"

# Task 3 - Qwen V2 search
qwen "<paste the prompt from TASK 3>"
```

Then come back to me and I'll verify everything worked!

---

**Last Updated**: December 25, 2025
**Next Phase**: Phase 2 - Modularize Backend (Day 2)
