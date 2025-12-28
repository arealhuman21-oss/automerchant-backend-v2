# 🔒 Row Level Security (RLS) Deployment Guide

**Status:** CRITICAL SECURITY UPDATE - Required before production launch
**Date:** December 27, 2025
**Blocks:** Production deployment

---

## 📋 What Changed

### 1. Database Configuration (`config/database.js`)
- ✅ **Changed:** Default client now uses `SUPABASE_ANON_KEY` (enforces RLS)
- ✅ **Added:** `supabaseService` for admin/system operations (bypasses RLS)
- ✅ **Added:** `getAuthenticatedClient()` helper for user-specific operations

### 2. RLS Migration (`migrations/008_enable_rls.sql`)
- ✅ Created comprehensive RLS policies for all tables
- ✅ Policies enforce user_id checks at database level
- ✅ Prevents users from accessing each other's data

### 3. Code Updates
- ✅ **server.js:** Cron jobs use `supabaseService`
- ✅ **auth.routes.js:** OAuth flows use `supabaseService`
- ✅ **admin.routes.js:** Admin operations use `supabaseService`
- ✅ **middleware/auth.js:** Admin checks use `supabaseService`
- ✅ **recommendations.routes.js:** Fixed privilege escalation vulnerabilities

---

## 🚀 Deployment Steps

### **STEP 1: Configure Supabase JWT Settings**

**CRITICAL:** RLS policies rely on Supabase recognizing your custom JWT tokens.

1. Go to Supabase Dashboard
2. Navigate to: **Settings > API > JWT Settings**
3. Update the **JWT Secret** to match your `JWT_SECRET` environment variable
4. Save changes

**Why?** This allows Supabase to parse your custom JWT tokens and make the user ID available to RLS policies via `auth.user_id()`.

---

### **STEP 2: Run RLS Migration**

Run the migration in Supabase SQL Editor:

```bash
# Option 1: Run directly in Supabase SQL Editor
1. Open Supabase Dashboard > SQL Editor
2. Copy contents of backend/migrations/008_enable_rls.sql
3. Paste and execute

# Option 2: Use psql (if you have direct database access)
psql $DATABASE_URL -f backend/migrations/008_enable_rls.sql
```

**Verify migration succeeded:**
```sql
-- Check that RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

### **STEP 3: Verify Environment Variables**

Ensure these are set in Vercel (or your deployment platform):

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ANON key, not SERVICE key!
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # For admin operations only
JWT_SECRET=your-secret-key-must-match-supabase-jwt-settings  # MUST match Supabase!

# Recommended (should already be set)
NODE_ENV=production
CRON_SECRET=your-cron-secret
```

**⚠️ CRITICAL:** The `JWT_SECRET` in your environment MUST match the JWT Secret in Supabase Dashboard (Step 1).

---

### **STEP 4: Deploy Code Changes**

```bash
# Commit changes
git add backend/
git commit -m "Add Row Level Security (RLS) for data isolation"

# Push to trigger Vercel deployment
git push origin main
```

---

### **STEP 5: Test RLS Policies**

#### **Test 1: Verify users can only see their own data**

```bash
# Test with User A's token
curl -H "Authorization: Bearer USER_A_TOKEN" \
  https://your-backend.vercel.app/api/products

# Should only return User A's products

# Test with User B's token
curl -H "Authorization: Bearer USER_B_TOKEN" \
  https://your-backend.vercel.app/api/products

# Should only return User B's products (different from User A)
```

#### **Test 2: Verify users cannot access other users' data**

```bash
# Try to access User B's product with User A's token
# (Find a product_id that belongs to User B)

curl -X POST \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cost_price": 999}' \
  https://your-backend.vercel.app/api/products/USER_B_PRODUCT_ID/cost-price

# Should return success but NOT actually update (RLS blocks it)
# Verify in database that product was not updated
```

#### **Test 3: Verify OAuth flow still works**

```bash
# Test Shopify OAuth installation
1. Visit: https://your-backend.vercel.app/auth/shopify/install?shop=test-store.myshopify.com
2. Complete OAuth flow
3. Verify shop is created in database with correct user_id
```

#### **Test 4: Verify cron job still works**

```bash
# Trigger cron endpoint
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-backend.vercel.app/cron/auto-analysis

# Should process all users (uses supabaseService)
```

---

## ✅ Security Verification Checklist

Run through this checklist after deployment:

### Database Security
- [ ] RLS is enabled on all tables (run verification query from Step 2)
- [ ] JWT Secret in Supabase matches JWT_SECRET environment variable
- [ ] Default database client uses ANON_KEY (not SERVICE_KEY)

### Code Security
- [ ] All user-facing routes use `supabase` (ANON client)
- [ ] All admin routes use `supabaseService`
- [ ] OAuth routes use `supabaseService`
- [ ] Cron endpoint uses `supabaseService`

### Authorization Checks
- [ ] All UPDATE queries include `.eq('user_id', userId)` check
- [ ] All DELETE queries include `.eq('user_id', userId)` check
- [ ] No direct product/recommendation access without user_id verification

### Environment Variables
- [ ] `NODE_ENV=production` set in Vercel
- [ ] `SUPABASE_ANON_KEY` set in Vercel
- [ ] `JWT_SECRET` matches Supabase JWT settings
- [ ] All secrets rotated (if .env was previously committed to git)

### Testing
- [ ] Logged in as User A, can only see own data
- [ ] Logged in as User B, can only see own data
- [ ] User A cannot modify User B's data
- [ ] OAuth flow creates shops with correct user_id
- [ ] Admin endpoints work for admin users
- [ ] Cron job can access all users' data

---

## 🔥 Rollback Plan

If RLS causes issues in production:

1. **Disable RLS temporarily** (in Supabase SQL Editor):
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
   ALTER TABLE products DISABLE ROW LEVEL SECURITY;
   ALTER TABLE recommendations DISABLE ROW LEVEL SECURITY;
   ALTER TABLE price_changes DISABLE ROW LEVEL SECURITY;
   ALTER TABLE analysis_schedule DISABLE ROW LEVEL SECURITY;
   ALTER TABLE manual_analyses DISABLE ROW LEVEL SECURITY;
   ```

2. **Revert code changes:**
   ```bash
   git revert HEAD
   git push
   ```

3. **Investigate and fix issues**

4. **Re-enable RLS when ready:**
   ```sql
   ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
   ```

---

## 📊 Monitoring

After deployment, monitor for:

- **Unauthorized access attempts:** Check logs for 401/403 errors
- **RLS policy failures:** Database errors mentioning "row-level security"
- **Performance impact:** Query latency (RLS adds minimal overhead)
- **Broken functionality:** Features that stopped working after RLS

---

## 🎯 Success Criteria

RLS deployment is successful when:

1. ✅ All tables have RLS enabled
2. ✅ Users can only see their own data
3. ✅ Users cannot modify other users' data
4. ✅ OAuth flow works correctly
5. ✅ Cron jobs work correctly
6. ✅ Admin panel works correctly
7. ✅ No 500 errors in production logs
8. ✅ All security tests pass

---

## 🚨 Known Issues & Solutions

### Issue 1: "No rows returned" errors
**Cause:** RLS policies blocking legitimate access
**Solution:** Check that JWT token is being sent with requests and contains valid `id` claim

### Issue 2: Admin operations failing
**Cause:** Admin routes using `supabase` instead of `supabaseService`
**Solution:** Verify all admin routes import and use `supabaseService`

### Issue 3: OAuth creating shops without user_id
**Cause:** user_email parameter not being passed or user not found
**Solution:** Ensure OAuth redirect includes `user_email` parameter

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Security plan: `SECURITY_FIX_PLAN.md`

---

**Last Updated:** December 27, 2025
**Next Review:** After first production deployment
