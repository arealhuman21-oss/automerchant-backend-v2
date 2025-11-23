# 🚀 AutoMerchant Project - Session Handoff Document

## 📋 Quick Context for Next Session

**Project:** AutoMerchant - AI-powered pricing optimization for Shopify stores

**What We Built Today:** Complete waitlist system with Google OAuth

**Current Status:** ✅ FULLY WORKING on production (https://automerchant.vercel.app)

---

## 🗂️ Project Structure

```
automerchant-local/
├── frontend/
│   ├── src/
│   │   ├── App.old.js          ← YOUR WORKING PRODUCT (Dashboard with AI pricing)
│   │   ├── App.js              ← Shopify Polaris dashboard (alternative)
│   │   ├── App.waitlist.js     ← CURRENTLY DEPLOYED (Waitlist landing page)
│   │   ├── lib/
│   │   │   └── supabaseClient.js
│   │   └── index.js            ← Entry point (imports App.waitlist.js)
│   ├── .env.production         ← Supabase + Backend URLs
│   └── vercel.json             ← Vercel config (root: /frontend)
│
├── backend/
│   ├── server.js               ← Express + Supabase + AI pricing logic
│   ├── .env                    ← Database URL, JWT secrets
│   └── vercel.json             ← Vercel config (root: /backend)
│
└── embedded-app/               ← Shopify iframe app (lightweight)
```

---

## 🎯 What's Currently Deployed

### **Frontend:** https://automerchant.vercel.app
- **File:** `App.waitlist.js`
- **Purpose:** Waitlist landing page with Google OAuth
- **Features:**
  - Beautiful gradient Tailwind UI
  - Live waitlist count display
  - Google OAuth sign-in
  - Success page with signup number
  - Logout button
  - Airtight duplicate prevention

### **Backend:** https://automerchant-backend-v2.vercel.app
- **File:** `server.js`
- **Status:** ✅ Working (/api/health returns 200)
- **Features:**
  - Supabase connection
  - AI pricing recommendations
  - Shopify integration
  - User authentication

---

## 🔐 Important Credentials & Config

### **Supabase** (Database & Auth)
- **Project:** `mfuqxntaivvqiajfgjtv`
- **URL:** `https://mfuqxntaivvqiajfgjtv.supabase.co`
- **Tables:**
  - `waitlist_emails` (id, email, created_at) ← Unique constraint on email
  - `waitlist_metrics` (id, total_signups, updated_at)
  - `users`, `products`, `recommendations`, `orders` (for main app)

### **Supabase Settings (CRITICAL):**
- **Site URL:** `https://automerchant.vercel.app`
- **Redirect URLs:**
  - `https://automerchant.vercel.app`
  - `https://automerchant.vercel.app/**`
  - `http://localhost:3000`
  - `http://localhost:3000/**`
- **Google OAuth:** Enabled
- **RLS Policies:** Active (see `frontend/WAITLIST_RLS_FIX.sql`)

### **Vercel Projects**
1. **automerchant** (Frontend)
   - Root: `/frontend`
   - Env vars: `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`

2. **automerchant-backend-v2** (Backend)
   - Root: `/backend`
   - Env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`

---

## ✅ What's Working (Fully Tested)

### Waitlist Flow
1. ✅ Visit site → See live count (e.g., "🚀 127 people joined")
2. ✅ Click "Join Waitlist" → Google OAuth popup
3. ✅ Sign in → Redirects back with hash token
4. ✅ Auto-processes signup → Adds to database
5. ✅ Shows success page: "You're signup #X"
6. ✅ Logout button → Returns to landing
7. ✅ Sign in again → Same number (NO duplicate count)

### Duplicate Prevention (Airtight)
- **Layer 1:** Check database before insert
- **Layer 2:** Unique constraint on email column
- **Result:** Count NEVER increases for same user

### OAuth Handling
- ✅ Hash-based tokens (`#access_token=...`)
- ✅ Query-based codes (`?code=...`)
- ✅ URL cleanup after processing
- ✅ Returning user detection

---

## 🛠️ Key Technical Solutions Implemented

### Problem 1: OAuth redirecting to localhost
**Solution:** Updated Supabase Site URL to production domain

### Problem 2: Hash tokens not detected
**Solution:** Added `window.location.hash.includes('access_token')` check

### Problem 3: Count incrementing on re-login
**Solution:**
- Check database before insert
- Skip increment if user exists
- Show original signup number

### Problem 4: RLS policy errors
**Solution:** Created policies for both `anon` and `authenticated` roles

### Problem 5: Modal showing "0 people joined"
**Solution:** Removed modal entirely, created full-page success view

---

## 📊 Database Schema (Key Tables)

### `waitlist_emails`
```sql
CREATE TABLE waitlist_emails (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint prevents duplicates
ALTER TABLE waitlist_emails
ADD CONSTRAINT waitlist_emails_email_key UNIQUE (email);
```

### `waitlist_metrics`
```sql
CREATE TABLE waitlist_metrics (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_signups INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `increment_waitlist()` Function
```sql
CREATE OR REPLACE FUNCTION increment_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE waitlist_metrics
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;
```

---

## 🎨 UI Components Built

### Landing Page (`App.waitlist.js`)
- Gradient background (purple/slate)
- Hero section with logo
- Live waitlist count badge
- "Join Waitlist" CTA button
- 3 feature cards (AI Analysis, Manual Control, Pro Plan)

### Success Page
- Animated bouncing checkmark
- "You're officially on the waitlist!" message
- Signup number display
- User email shown
- Logout button (top-right)
- Feature cards

### OAuth Loading State
- Spinning icon
- "Signing you in..." text

---

## 🚀 Deployment Commands

### Deploy Frontend Only
```bash
cd frontend
npm run build
git add .
git commit -m "Update frontend"
git push origin master
# Vercel auto-deploys
```

### Deploy Backend Only
```bash
cd backend
git add .
git commit -m "Update backend"
git push origin master
# Vercel auto-deploys
```

### Force Fresh Deployment (Clear Cache)
```bash
git commit --allow-empty -m "Force redeploy"
git push origin master
```

### Switch to Dashboard Product
```javascript
// In frontend/src/index.js, change:
import App from './App.waitlist';
// To:
import App from './App.old';
```

---

## 🐛 Common Issues & Fixes

### Issue: "Nothing works on Vercel but localhost works"
**Fix:** Check environment variables in Vercel dashboard

### Issue: OAuth redirects to localhost
**Fix:** Update Supabase Site URL to production domain

### Issue: Stuck on hash URL after OAuth
**Fix:** Already implemented - hash detection in useEffect

### Issue: Count increases on re-login
**Fix:** Already implemented - duplicate check before insert

### Issue: RLS policy errors
**Fix:** Run SQL in `frontend/WAITLIST_RLS_FIX.sql`

---

## 📝 Important Files Reference

### Must-Read Files
1. `frontend/src/App.waitlist.js` - Current deployed waitlist
2. `frontend/src/App.old.js` - Main product (dashboard)
3. `backend/server.js` - Backend API
4. `frontend/WAITLIST_RLS_FIX.sql` - Database policies

### Config Files
1. `frontend/.env.production` - Production env vars
2. `frontend/.env.local` - Local dev env vars
3. `backend/.env` - Backend env vars
4. `frontend/vercel.json` - Frontend deployment config
5. `backend/vercel.json` - Backend deployment config

---

## 🎯 Next Steps / TODO

### Immediate
- [ ] Continue building out dashboard features
- [ ] Test AI pricing recommendations with real Shopify data
- [ ] Set up email notifications for waitlist users

### Future
- [ ] Add payment/subscription system
- [ ] Enhance AI pricing algorithm
- [ ] Build analytics dashboard
- [ ] Create admin panel for waitlist management

---

## 💡 Quick Tips

1. **App.old.js is your MAIN PRODUCT** - It's completely safe and untouched
2. **Always test locally first** - Run `npm start` in frontend folder
3. **Check Vercel logs** if deployment fails
4. **Supabase RLS** must be configured for auth to work
5. **Environment variables** must match between local and Vercel

---

## 🔗 Important URLs

- **Production Site:** https://automerchant.vercel.app
- **Backend API:** https://automerchant-backend-v2.vercel.app
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mfuqxntaivvqiajfgjtv
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repo:** arealhuman21-oss/automerchant-backend-v2

---

## 📞 Quick Start Commands for Next Session

```bash
# Start local development
cd frontend
npm start
# Visit http://localhost:3000

# Start backend locally
cd backend
node server.js
# Runs on http://localhost:5000

# Deploy changes
git add .
git commit -m "Your changes"
git push origin master
```

---

## ✨ Session Summary

**What We Accomplished Today:**
1. ✅ Fixed frontend deployment path
2. ✅ Implemented Google OAuth waitlist flow
3. ✅ Created beautiful success page
4. ✅ Added logout functionality
5. ✅ Implemented airtight duplicate prevention
6. ✅ Fixed OAuth hash token detection
7. ✅ Added live waitlist count display
8. ✅ Resolved localhost redirect issue
9. ✅ Tested and verified entire flow end-to-end

**Final Status:** 🎉 EVERYTHING WORKING IN PRODUCTION

**Your main product (App.old.js) is 100% safe and ready to deploy when you want to!**

---

*Generated: November 4, 2025*
*Last Updated: End of Session*
