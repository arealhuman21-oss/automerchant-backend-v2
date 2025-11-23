# AutoMerchant Dual-Mode Shopify Authentication

## Overview

This backend now supports **two authentication modes** for Shopify API calls:

1. **Manual Mode** (Development) - Uses hardcoded credentials from `.env` file
2. **OAuth Mode** (Production) - Uses dynamic tokens from `shops` table in database

This allows you to:
- Test locally with a single test store without implementing OAuth
- Deploy to production with full multi-merchant OAuth support
- Switch between modes with a single environment variable

---

## Architecture

### Files Modified/Created

1. **`shopify-auth.js`** - Helper module for dual-mode authentication
2. **`server.js`** - Updated all Shopify API routes to use dual-mode auth
3. **`migrations/002_shops_table.sql`** - Database schema for OAuth tokens
4. **`.env`** - Added `AUTH_MODE`, `SHOP`, and `SHOPIFY_ACCESS_TOKEN` variables

### Routes Updated

All routes that make Shopify API calls now use `getShopifyCredentials()`:

- ✅ `POST /api/products/sync` - Syncs products from Shopify
- ✅ `POST /api/price-changes/apply` - Updates product prices
- ✅ `GET /api/orders` - Fetches order data
- ✅ `runAnalysisForUser()` - Background analysis function
- ✅ `GET /api/test-auth` - **NEW** Test endpoint to verify auth mode

---

## Mode 1: Manual Mode (Local Development)

### When to Use
- Local development on your machine
- Testing with a single Shopify development store
- Quick prototyping without OAuth setup

### Setup Instructions

#### Step 1: Get Shopify Admin API Token

1. Go to your Shopify admin: `https://YOUR-STORE.myshopify.com/admin`
2. Navigate to **Settings → Apps and sales channels → Develop apps**
3. Click **Create an app** (name it "AutoMerchant Dev")
4. Go to **Configuration** tab
5. Under **Admin API access scopes**, select:
   - `read_products`
   - `write_products`
   - `read_orders`
   - `write_inventory`
6. Click **Save**, then go to **API credentials** tab
7. Click **Install app** to your store
8. Copy the **Admin API access token** (starts with `shpat_`)

#### Step 2: Configure Backend `.env`

Edit `backend/.env`:

```bash
# Set mode to manual
AUTH_MODE=manual

# Add your store credentials
SHOP=your-test-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 3: Start Backend

```bash
cd backend
npm install
npm start
```

You should see:

```
🔐 ============================================
   SHOPIFY AUTHENTICATION MODE
============================================
📍 Mode: MANUAL (Development)
📋 Config:
   - Shop: your-test-store.myshopify.com
   - Token: ✅ Set (shpat_...)
💡 Using hardcoded credentials from .env file
============================================
```

#### Step 4: Test Authentication

```bash
# Log in to get JWT token
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Test Shopify connection (replace YOUR_JWT_TOKEN)
curl http://localhost:5000/api/test-auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:

```json
{
  "status": "success",
  "mode": "manual",
  "message": "✅ Connected to Shopify successfully in MANUAL mode",
  "shop": {
    "domain": "your-test-store.myshopify.com",
    "name": "Your Test Store",
    "email": "you@example.com",
    "currency": "USD",
    "plan": "affiliate"
  },
  "config": {
    "source": "environment variables (.env)"
  }
}
```

---

## Mode 2: OAuth Mode (Production)

### When to Use
- Production deployment on Vercel
- Supporting multiple merchants installing your app
- Full Shopify App Store distribution

### Setup Instructions

#### Step 1: Run Database Migration

The `shops` table stores OAuth tokens for each merchant:

```bash
cd backend

# Connect to your Supabase database
psql "postgresql://postgres.xxx:xxx@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Run migration
\i migrations/002_shops_table.sql
```

Or use the Supabase SQL Editor:

```sql
-- Copy and paste the contents of migrations/002_shops_table.sql
```

#### Step 2: Implement OAuth Flow (Frontend)

You'll need to build OAuth endpoints in your backend and frontend. Here's the flow:

**Backend - Add OAuth Callback Route** (Add to `server.js`):

```javascript
// OAuth callback from Shopify
app.get('/api/shopify/callback', async (req, res) => {
  const { code, shop, state } = req.query;

  // Validate state (CSRF protection)
  // Exchange code for access token
  const tokenResponse = await axios.post(
    `https://${shop}/admin/oauth/access_token`,
    {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    }
  );

  const { access_token, scope } = tokenResponse.data;

  // Store in shops table
  await pool.query(
    `INSERT INTO shops (shop_domain, access_token, scope)
     VALUES ($1, $2, $3)
     ON CONFLICT (shop_domain)
     DO UPDATE SET access_token = $2, scope = $3, updated_at = NOW()`,
    [shop, access_token, scope]
  );

  res.redirect(`https://automerchant.vercel.app/success?shop=${shop}`);
});
```

#### Step 3: Configure Vercel Environment Variables

In Vercel dashboard, set:

```bash
AUTH_MODE=oauth
DATABASE_URL=postgresql://...
# Do NOT set SHOP or SHOPIFY_ACCESS_TOKEN in production
```

#### Step 4: Deploy to Vercel

```bash
cd backend
vercel --prod
```

You should see in Vercel logs:

```
🔐 ============================================
   SHOPIFY AUTHENTICATION MODE
============================================
📍 Mode: OAUTH (Production)
💡 Using dynamic tokens from shops table in database
📋 Tokens fetched per-request based on shop domain
============================================
```

#### Step 5: Test OAuth Mode

After a merchant installs your app and you have their token in the `shops` table:

```bash
# The shop domain should be in req.query.shop or linked to user
curl https://your-backend.vercel.app/api/test-auth?shop=merchant-store.myshopify.com \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## Switching Between Modes

### Local Development → Production

**Before deploying to Vercel:**

1. Run database migration: `migrations/002_shops_table.sql`
2. Update Vercel env vars: `AUTH_MODE=oauth`
3. Remove `SHOP` and `SHOPIFY_ACCESS_TOKEN` from Vercel
4. Deploy: `vercel --prod`

### Production → Local Testing

**To test locally with manual mode:**

1. Edit `backend/.env`:
   ```bash
   AUTH_MODE=manual
   SHOP=your-test-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxx
   ```
2. Restart backend: `npm start`
3. Verify in console logs: "Mode: MANUAL"

---

## How It Works Internally

### Manual Mode Flow

```
1. Request comes in → /api/products/sync
2. getShopifyCredentials() checks AUTH_MODE=manual
3. Returns: { shop: process.env.SHOP, accessToken: process.env.SHOPIFY_ACCESS_TOKEN }
4. Makes Shopify API call with credentials from .env
```

### OAuth Mode Flow

```
1. Request comes in → /api/products/sync
2. getShopifyCredentials() checks AUTH_MODE=oauth
3. Extracts shop from req.query.shop or req.user.shopify_shop
4. Queries: SELECT access_token FROM shops WHERE shop_domain = $1
5. Returns: { shop, accessToken } from database
6. Makes Shopify API call with OAuth token
```

---

## Troubleshooting

### "SHOP and SHOPIFY_ACCESS_TOKEN must be set"

**Cause:** Running in `AUTH_MODE=manual` without credentials in `.env`

**Fix:**
```bash
# backend/.env
SHOP=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

### "OAuth token not found for shop"

**Cause:** Running in `AUTH_MODE=oauth` but shop not in database

**Fix:**
1. Check `shops` table: `SELECT * FROM shops WHERE shop_domain = 'store.myshopify.com';`
2. If missing, complete OAuth flow to insert token
3. Or manually insert for testing:
   ```sql
   INSERT INTO shops (shop_domain, access_token)
   VALUES ('test-store.myshopify.com', 'shpat_xxxxx');
   ```

### "Invalid or expired token"

**Cause:** Shopify token is no longer valid

**Fix (Manual Mode):**
1. Regenerate token in Shopify admin
2. Update `.env` with new token

**Fix (OAuth Mode):**
1. Merchant needs to reinstall app
2. Or manually update: `UPDATE shops SET access_token = 'new_token' WHERE shop_domain = 'xxx';`

---

## Testing Checklist

### Manual Mode Testing

- [ ] Set `AUTH_MODE=manual` in `.env`
- [ ] Add `SHOP` and `SHOPIFY_ACCESS_TOKEN` to `.env`
- [ ] Start backend: `npm start`
- [ ] Verify console shows "Mode: MANUAL"
- [ ] Test `/api/test-auth` endpoint
- [ ] Test `/api/products/sync` endpoint
- [ ] Verify products sync from your test store

### OAuth Mode Testing

- [ ] Run migration: `002_shops_table.sql`
- [ ] Insert test shop token in `shops` table
- [ ] Set `AUTH_MODE=oauth` in Vercel
- [ ] Deploy to Vercel
- [ ] Verify logs show "Mode: OAUTH"
- [ ] Test `/api/test-auth?shop=store.myshopify.com`
- [ ] Test product sync for OAuth shop

---

## Security Best Practices

### Manual Mode (Development Only!)

⚠️ **NEVER commit `.env` file with real tokens to Git**

- Add `.env` to `.gitignore`
- Use `.env.example` with placeholder values
- Rotate tokens regularly

### OAuth Mode (Production)

✅ **Recommended:**

- Store tokens encrypted in database (future enhancement)
- Validate `shop` parameter to prevent token leakage
- Implement webhook to detect uninstalls and deactivate tokens
- Use HTTPS only in production
- Validate Shopify HMAC signatures on callbacks

---

## Next Steps

### Future Enhancements

1. **Automatic OAuth Flow** - Build full install/callback handlers
2. **Token Encryption** - Encrypt `access_token` in `shops` table
3. **Webhook Support** - Handle app uninstall events
4. **Multi-User Support** - Link multiple users to same shop
5. **Rate Limiting** - Per-shop API rate limit tracking

### OAuth Implementation TODO

To fully implement OAuth mode, you need:

1. Shopify App credentials (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`)
2. OAuth install URL generator
3. OAuth callback handler
4. State parameter validation (CSRF protection)
5. Webhook handlers for app lifecycle events

---

## Questions?

If you encounter issues:

1. Check startup logs for mode confirmation
2. Test `/api/test-auth` endpoint
3. Verify database has `shops` table (OAuth mode)
4. Verify `.env` has credentials (Manual mode)
5. Check Shopify Admin API permissions/scopes

**Happy coding!** 🚀
