# Quick Start: Dual-Mode Shopify Auth

## TL;DR - Get Started in 2 Minutes

### For Local Development (Manual Mode)

1. **Get Shopify token:**
   - Go to Shopify Admin → Settings → Apps and sales channels → Develop apps
   - Create app, grant permissions, install, copy token

2. **Configure `.env`:**
   ```bash
   AUTH_MODE=manual
   SHOP=your-test-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   ```

3. **Start backend:**
   ```bash
   cd backend
   npm start
   ```

4. **Verify:**
   - Look for "Mode: MANUAL" in console
   - Test: `GET /api/test-auth` (requires auth token)

---

### For Production (OAuth Mode)

1. **Run migration:**
   ```bash
   # In Supabase SQL Editor or via psql
   -- Run: migrations/002_shops_table.sql
   ```

2. **Set Vercel env:**
   ```bash
   AUTH_MODE=oauth
   # Do NOT set SHOP or SHOPIFY_ACCESS_TOKEN
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Verify:**
   - Check Vercel logs for "Mode: OAUTH"
   - Tokens come from `shops` table

---

## Key Endpoints

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `GET /api/test-auth` | Test Shopify connection & show mode | Yes (JWT) |
| `POST /api/products/sync` | Sync products (uses dual-mode) | Yes (JWT) |
| `POST /api/price-changes/apply` | Update prices (uses dual-mode) | Yes (JWT) |
| `GET /api/orders` | Fetch orders (uses dual-mode) | Yes (JWT) |

---

## What Changed?

All Shopify API calls now route through `getShopifyCredentials()` which:

- **Manual mode:** Returns `SHOP` + `SHOPIFY_ACCESS_TOKEN` from `.env`
- **OAuth mode:** Fetches token from `shops` table by shop domain

**Zero code changes needed when switching modes** - just update `AUTH_MODE` env var!

---

## Frontend Notes

**You have TWO frontends:**

1. **`App.waitlist.js`** (currently active) - Waitlist page
2. **`App.old.js`** - Full SaaS dashboard (deployed to Vercel)
3. **`App.js`** - Embedded Shopify iframe (just a button linking to main site)

**Architecture:**
- Merchant installs Shopify app → sees iframe (`App.js`)
- Iframe has button → redirects to `https://automerchant.vercel.app`
- Main site (`App.old.js`) makes all API calls to backend
- Backend uses dual-mode auth to talk to Shopify

---

## Files Created/Modified

### New Files
- ✅ `backend/shopify-auth.js` - Dual-mode helper
- ✅ `backend/migrations/002_shops_table.sql` - OAuth token storage
- ✅ `backend/DUAL_MODE_AUTH_GUIDE.md` - Full documentation
- ✅ `backend/QUICK_START.md` - This file

### Modified Files
- ✅ `backend/server.js` - Updated all Shopify routes + startup logging
- ✅ `backend/.env` - Added `AUTH_MODE`, `SHOP`, `SHOPIFY_ACCESS_TOKEN`

---

## Need Help?

Read the full guide: `DUAL_MODE_AUTH_GUIDE.md`
