# 🤖 QWEN SECURITY TASKS - RUN THESE NOW!

**AI:** Qwen (FREE unlimited tokens!)
**Priority:** CRITICAL - Start immediately
**Can run in parallel:** YES (independent of Gemini tasks)
**Estimated Time:** 45 minutes total

---

## ⚡ WHY QWEN?

You're handling simple file operations and cleanup tasks that don't require complex logic. These are critical but straightforward - perfect for your unlimited free tier!

---

## 🚨 TASK Q1: FIX .ENV GIT EXPOSURE (URGENT - 15 MIN)

**Priority:** CRITICAL - Do this FIRST!
**Risk:** All production secrets exposed in git history

### Instructions:

```bash
cd C:/Users/ben_l/automerchant-local

# STEP 1: Remove .env from git tracking
git rm --cached backend/.env
git status  # Should show .env as deleted from git

# STEP 2: Commit the removal
git commit -m "🔒 SECURITY: Remove exposed .env from version control"

# STEP 3: Fix .gitignore
# Add these lines to backend/.gitignore (append at end):
```

Add to `backend/.gitignore`:
```
# Environment variables (CRITICAL - NEVER COMMIT!)
.env
.env.*
!.env.example
*.env
.env.local
.env.production
.env.development
```

```bash
# STEP 4: Commit .gitignore fix
git add backend/.gitignore
git commit -m "🔒 Add .env to .gitignore"

# STEP 5: Push changes
git push origin refactor-to-production
```

### Verification:

Run these commands and report output:
```bash
git status
git log --oneline -3
git ls-files | grep ".env"  # Should return NOTHING
cat backend/.gitignore
```

### Expected Output:
- `.env` should NOT appear in `git ls-files`
- `.gitignore` should contain the .env patterns
- Git history should show your 2 new commits

### Report Back:
```
✅ TASK Q1 COMPLETE
Files changed:
  - backend/.env (removed from git)
  - backend/.gitignore (updated)
Commits: 2
Status: .env is no longer tracked in git
Next: User will rotate secrets manually, then proceed to Q2
```

---

## 🧹 TASK Q2: CLEAN UP CONSOLE.LOGS (30 MIN)

**Priority:** MEDIUM
**Risk:** Verbose logging exposes sensitive data in production
**Can start:** After Q1 or in parallel if you prefer

### What to Remove:

Search for and remove **verbose debug logs** in `backend/` directory:

**Files to check:**
- `backend/server.js`
- `backend/services/analysis.service.js`
- `backend/analyzeProduct-v3.js`
- `backend/controllers/*.js`
- `backend/routes/*.js`

### Rules:

**❌ REMOVE these patterns:**
```javascript
console.log('Raw data:', ...)
console.log('Analyzing product:', ...)
console.log('   Price:', ...)
console.log('   Sales:', ...)
console.log('Debug:', ...)
console.log('Test:', ...)
console.log(`📊 Existing schedule:`, ...)
console.log(`⏰ Schedule expired`, ...)
```

**✅ KEEP these patterns:**
```javascript
console.error('Error:', ...)  // Keep ALL error logs
console.warn('Warning:', ...)  // Keep ALL warnings
console.log('🚀 Server running on port', ...)  // Keep startup logs
console.log('✅ Supabase connected')  // Keep connection confirmations
```

### Strategy:

1. **Search for console.log:**
   ```bash
   cd backend
   grep -r "console.log" --include="*.js" . | grep -v node_modules | wc -l
   # This shows total count
   ```

2. **Remove verbose logs:**
   - Open each file
   - Remove debug/verbose console.logs
   - Keep errors, warnings, and critical status messages

3. **Don't break functionality:**
   - If unsure, keep the log
   - Focus on obviously verbose logs (like "Raw data", "Analyzing", etc.)

### Target:

Reduce from **626 console.logs** to approximately **150-200** (keep critical ones only)

### Report Back:

```
✅ TASK Q2 COMPLETE
Console.logs removed: [number]
Console.logs remaining: [number]
Files modified: [list]
Kept: Error logs, warnings, startup messages
Removed: Debug logs, verbose data dumps
Next: Ready for Gemini tasks
```

---

## 📝 TASK Q3: CREATE .ENV.EXAMPLE FILE (5 MIN)

**Priority:** LOW
**Can start:** Anytime in parallel

### Instructions:

Create/update `backend/.env.example` with safe template values:

```bash
# Create or replace backend/.env.example
```

File contents:
```bash
# ============ DATABASE ============
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# ============ JWT ============
JWT_SECRET=your-super-secret-jwt-key-min-64-chars-use-crypto-randomBytes

# ============ SHOPIFY AUTH ============
AUTH_MODE=oauth

# ============ ALGORITHM ============
USE_ALGORITHM_V3=true
USE_ALGORITHM_V2=false

# ============ ENVIRONMENT ============
NODE_ENV=production

# ============ CRON ============
CRON_SECRET=your-cron-secret-key-min-32-chars

# ============ ADMIN ============
ADMIN_SECRET=your-admin-panel-secret
```

```bash
git add backend/.env.example
git commit -m "📝 Update .env.example template"
git push
```

### Report Back:
```
✅ TASK Q3 COMPLETE
File: backend/.env.example updated
Contains: Safe template values (no real secrets)
Next: All Qwen tasks complete!
```

---

## 🎯 EXECUTION ORDER

**Run tasks in this order:**

1. **Q1 (URGENT):** Fix .env git exposure → 15 min
2. **User waits:** User rotates secrets in Vercel → 30 min
3. **Q2 (PARALLEL):** Clean console.logs → 30 min
4. **Q3 (QUICK):** Update .env.example → 5 min

**Total Qwen Time:** 50 minutes
**Total User Wait Time:** 0 (you work while user rotates secrets!)

---

## ✅ SUCCESS CRITERIA

After all tasks:

- [ ] `.env` removed from git tracking
- [ ] `.gitignore` properly configured
- [ ] Changes committed and pushed
- [ ] Console.logs reduced by ~70%
- [ ] `.env.example` has safe template
- [ ] All changes tested (npm test)

---

## 🚀 START COMMAND

**Run this right now:**

```bash
qwen "Execute Task Q1 from QWEN_TASKS.md - Fix .env git exposure. Follow all steps exactly and report back with verification output."
```

Then start Q2 and Q3 while user rotates secrets!

---

## 💬 REPORTING TEMPLATE

After each task, report using this format:

```
✅ TASK Q[X] COMPLETE
AI: Qwen
Time: [actual time]
Files changed: [list files]
Commits: [number]
Issues: [any problems or "None"]
Verification: [output of verification commands]
Next: [what should happen next]
```

---

## 🆘 IF YOU GET STUCK

**Problem:** Git command fails
**Solution:** Report the exact error message, don't continue

**Problem:** Can't find a file
**Solution:** Use `ls -la` to check directory, report findings

**Problem:** Unsure about removing a console.log
**Solution:** Keep it (err on side of caution)

---

**Ready?** You're clearing the path for secure production! 🚀

**After you finish:** User will rotate secrets, then Gemini will handle code security fixes, then Claude will implement RLS.

GO! ⚡
