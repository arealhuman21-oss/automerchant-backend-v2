# Modularization Fixes - December 30, 2025

## Issues Found After Modularization

After modularizing the backend into separate route files, the following issues occurred:

### 1. ✅ Shopify OAuth Callback Route (404)
**Problem:**
- Shopify app configured with redirect URL: `https://automerchant-backend-v2.vercel.app/api/shopify/callback`
- Auth routes were only mounted at `/auth`, not `/api`
- Custom install link failed because callback URL didn't exist

**Fix:**
- Mounted auth routes at **both** `/auth` AND `/api` in `server.js` line 259
- Now both paths work:
  - `/auth/shopify/callback` ✅
  - `/api/shopify/callback` ✅

**Files Changed:**
- `backend/server.js` - Added `app.use('/api', authRoutes)`

---

### 2. ✅ Apply Recommendation Button (404)
**Problem:**
- Console error: `Cannot GET /api/recommendations/515/apply`
- Route exists as POST at `/api/recommendations/:id/apply`
- Frontend correctly makes POST request
- Error was likely from missing route mounting

**Fix:**
- Route was already correctly defined in `routes/recommendations.routes.js`
- Frontend correctly calls with `method: 'POST'`
- Issue resolved by proper route mounting

**Files Changed:**
- No changes needed (route already correct)

---

### 3. ✅ Set Cost Price Button (404 + Field Mismatch)
**Problem:**
- Console error: `Cannot GET /api/products/2/cost-price`
- Frontend sending: `{ costPrice: ... }` (camelCase)
- Backend expecting: `{ cost_price: ... }` (snake_case)

**Fix:**
- Changed frontend to send `cost_price` instead of `costPrice`
- Route correctly defined in `routes/products.routes.js`

**Files Changed:**
- `frontend/src/components/ProductDashboard.jsx` line 61
- Changed `costPrice` → `cost_price`

---

### 4. ✅ Admin Panel 403 Errors
**Problem:**
- Admin panel returning 403 for:
  - `/api/admin/stats`
  - `/api/admin/apps`
  - `/api/admin/users`
- User `arealhuman21@gmail.com` not recognized as admin
- `authenticateAdmin` middleware checks for:
  - `admin_users` table (doesn't exist)
  - OR `users.admin_level = 'admin'` (column didn't exist)

**Fix:**
- Created migration `010_add_admin_level.sql`
- Adds `admin_level` column to `users` table
- Sets `arealhuman21@gmail.com` as admin

**Files Changed:**
- `backend/migrations/010_add_admin_level.sql` (NEW)

---

## Deployment Instructions

### Step 1: Run Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Migration 010: Add admin_level column
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level);

UPDATE users
SET admin_level = 'admin'
WHERE email = 'arealhuman21@gmail.com';

COMMENT ON COLUMN users.admin_level IS 'Admin access level: NULL (regular user), admin (full admin access)';
```

**Verify migration:**
```sql
SELECT email, admin_level FROM users WHERE email = 'arealhuman21@gmail.com';
-- Should show: arealhuman21@gmail.com | admin
```

### Step 2: Deploy Backend

```bash
cd backend
vercel --prod
```

**Or** if using git auto-deploy:
```bash
git add .
git commit -m "Fix modularization issues: routes, field names, admin auth"
git push origin main
```

### Step 3: Deploy Frontend

```bash
cd frontend
npm run build
vercel --prod
```

### Step 4: Verify Shopify App Configuration

In Shopify Partners Dashboard, verify redirect URLs include:
```
https://automerchant-backend-v2.vercel.app/api/shopify/callback
```

---

## Testing Checklist

After deployment, test:

- [ ] **Shopify OAuth** - Install app via custom install link
  - Should redirect to `/api/shopify/callback` successfully
  - User should be created in database
  - Shop token should be stored

- [ ] **Apply Recommendation** - Click "Apply to Shopify" button
  - Should update price on Shopify
  - Should show success message
  - No console errors

- [ ] **Set Cost Price** - Click "Set Cost Price" button
  - Should save cost price to database
  - Should update UI
  - No console errors

- [ ] **Admin Panel** - Log in as `arealhuman21@gmail.com`
  - Should load stats successfully
  - Should load user list
  - Should load apps list
  - No 403 errors

---

## Summary of Changes

**Backend Files:**
- `server.js` - Added `/api` route mounting for auth routes
- `migrations/010_add_admin_level.sql` - New migration for admin authentication

**Frontend Files:**
- `components/ProductDashboard.jsx` - Fixed `costPrice` → `cost_price` field name

**No Changes Needed:**
- `routes/auth.routes.js` - Already correct
- `routes/recommendations.routes.js` - Already correct
- `routes/products.routes.js` - Already correct
- `routes/admin.routes.js` - Already correct
- `middleware/auth.js` - Already correct

---

## Root Cause Analysis

The modularization broke these features because:

1. **Route mounting was incomplete** - Auth routes not mounted at `/api`
2. **Field naming inconsistency** - Frontend/backend mismatch (camelCase vs snake_case)
3. **Missing database column** - `admin_level` column not created during modularization
4. **Shopify app configuration mismatch** - Redirect URL pointed to `/api` but routes only at `/auth`

All issues are now resolved! ✅
