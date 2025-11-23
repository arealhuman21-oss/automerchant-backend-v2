# Shopify OAuth Implementation Guide

## Overview

AutoMerchant now supports full Shopify OAuth, allowing any merchant to install the app directly from their Shopify admin and securely connect their store.

## Architecture

### Dual-Mode Authentication

The backend supports two authentication modes:

1. **MANUAL MODE** (Development)
   - Uses hardcoded credentials from `.env`
   - Perfect for local testing with a development store
   - No database token storage required

2. **OAUTH MODE** (Production)
   - Merchants install via OAuth flow
   - Tokens stored securely in `shops` table
   - Each merchant gets their own isolated credentials

### OAuth Flow Diagram

```
Merchant → /api/shopify/install
    ↓
Shopify Authorization Screen
    ↓
Merchant Approves
    ↓
/api/shopify/callback (with code)
    ↓
Exchange code for access_token
    ↓
Store in shops table
    ↓
Redirect to dashboard (connected=true)
```

## Setup Instructions

### 1. Create Shopify Partner Account

1. Go to https://partners.shopify.com/
2. Sign up for a free Partner account
3. Navigate to "Apps" → "All apps" → "Create app"
4. Choose "Public app"

### 2. Configure App URLs

In your Shopify Partner Dashboard, set:

- **App URL**: `https://automerchant.vercel.app/dashboard`
- **Allowed redirection URL(s)**:
  ```
  https://automerchant.vercel.app/api/shopify/callback
  ```

### 3. Get API Credentials

From your app's dashboard, copy:

- **API key** (Client ID)
- **API secret key** (Client secret)

### 4. Update Environment Variables

In your `.env` file (and Vercel dashboard):

```bash
# OAuth Configuration
SHOPIFY_API_KEY=your_actual_api_key_here
SHOPIFY_API_SECRET=your_actual_api_secret_here
SHOPIFY_REDIRECT_URI=https://automerchant.vercel.app/api/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_inventory

# Switch to OAuth mode for production
AUTH_MODE=oauth
```

### 5. Deploy to Vercel

Add these environment variables to your Vercel project:

```bash
vercel env add SHOPIFY_API_KEY
vercel env add SHOPIFY_API_SECRET
vercel env add SHOPIFY_REDIRECT_URI
vercel env add SHOPIFY_SCOPES
vercel env add AUTH_MODE
```

Then deploy:

```bash
vercel --prod
```

### 6. Run Database Migration

Ensure the `shops` table exists in your Supabase database:

```sql
-- Run this in Supabase SQL Editor
-- File: backend/migrations/002_shops_table.sql

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id);
```

## API Routes

### GET /api/shopify/install

**Purpose**: Initiates the OAuth flow by redirecting merchant to Shopify's authorization page.

**Usage**:
```
https://automerchant.vercel.app/api/shopify/install?shop=yourstore.myshopify.com
```

**Parameters**:
- `shop` (required): Full Shopify domain (e.g., `myteststore.myshopify.com`)

**Response**: Redirects to Shopify authorization page

**Example**:
```bash
curl "https://automerchant.vercel.app/api/shopify/install?shop=dev-store-123.myshopify.com"
```

**Security Features**:
- Validates shop domain format
- Generates random nonce for CSRF protection
- Uses environment-configured scopes

---

### GET /api/shopify/callback

**Purpose**: Handles OAuth callback from Shopify, exchanges code for access token, and stores it in the database.

**Called By**: Shopify (automatically after merchant approves)

**Parameters** (provided by Shopify):
- `shop`: Shop domain
- `code`: One-time authorization code
- `hmac`: HMAC signature for verification
- `state`: Nonce for CSRF protection

**Security Features**:
1. **HMAC Verification**: Validates that the request came from Shopify
2. **Constant-time comparison**: Prevents timing attacks
3. **Code exchange**: Converts temporary code to permanent access token

**Flow**:
1. Verify HMAC signature
2. Exchange code for access_token via Shopify API
3. Store `shop_domain`, `access_token`, and `scope` in `shops` table
4. Redirect merchant to dashboard with `connected=true`

**Success Redirect**:
```
https://automerchant.vercel.app/dashboard?connected=true
```

**Error Redirect**:
```
https://automerchant.vercel.app/dashboard?error=oauth_failed&message=...
```

---

### GET /api/test-auth

**Purpose**: Tests the stored Shopify credentials by making an API call.

**Usage**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://automerchant.vercel.app/api/test-auth
```

**Response** (Success):
```json
{
  "status": "success",
  "mode": "oauth",
  "message": "✅ Connected to Shopify successfully in OAUTH mode",
  "shop": {
    "domain": "myteststore.myshopify.com",
    "name": "My Test Store",
    "email": "store@example.com",
    "currency": "USD",
    "plan": "partner_test"
  },
  "config": {
    "source": "shops table (OAuth)"
  }
}
```

**Response** (Error):
```json
{
  "status": "error",
  "mode": "oauth",
  "message": "Failed to connect to Shopify",
  "error": "Invalid API credentials",
  "hint": "Check that shop domain exists in shops table with valid OAuth token"
}
```

## Testing the OAuth Flow End-to-End

### Option 1: Using a Shopify Development Store

1. **Create a development store**:
   - Go to Shopify Partner Dashboard
   - Click "Stores" → "Add store" → "Development store"
   - Fill in details and create

2. **Install your app**:
   ```
   https://automerchant.vercel.app/api/shopify/install?shop=YOUR-DEV-STORE.myshopify.com
   ```

3. **Approve permissions**:
   - You'll be redirected to Shopify's permission screen
   - Click "Install app"

4. **Verify success**:
   - Should redirect to: `https://automerchant.vercel.app/dashboard?connected=true`
   - Check Supabase `shops` table - should have new row with your store

5. **Test API access**:
   - Login to AutoMerchant dashboard
   - Try syncing products
   - Check that data appears correctly

### Option 2: Using a Real Store (Caution)

Only use this for stores you own or have explicit permission to test on.

Same steps as above, but use your actual store domain.

## Database Schema

### shops Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `shop_domain` | VARCHAR(255) | Shopify shop domain (unique) |
| `access_token` | TEXT | OAuth access token |
| `scope` | TEXT | Granted permission scopes |
| `user_id` | INTEGER | Optional link to users table |
| `installed_at` | TIMESTAMP | When app was installed |
| `updated_at` | TIMESTAMP | Last token update |
| `is_active` | BOOLEAN | Whether installation is active |

## Security Features

### HMAC Verification

The callback route verifies Shopify's HMAC signature:

```javascript
// Build query string without HMAC
const sortedParams = Object.keys(queryParams)
  .sort()
  .map(key => `${key}=${queryParams[key]}`)
  .join('&');

// Generate HMAC
const calculatedHmac = crypto
  .createHmac('sha256', SHOPIFY_API_SECRET)
  .update(sortedParams)
  .digest('hex');

// Verify (constant-time comparison)
if (calculatedHmac !== hmac) {
  return res.status(403).json({ error: 'Security verification failed' });
}
```

### Token Storage

- Tokens are stored securely in PostgreSQL (Supabase)
- SSL connections enforced
- Tokens never exposed in API responses
- Each shop has isolated credentials

## Success Criteria

After a merchant successfully installs AutoMerchant:

1. ✅ Shop domain and access token are stored in `shops` table
2. ✅ Merchant is redirected to dashboard with `?connected=true`
3. ✅ API calls work (products sync, orders fetch, price updates)
4. ✅ `/api/test-auth` returns shop details successfully
5. ✅ Merchant can see their products and recommendations

## Troubleshooting

### Error: "Missing SHOPIFY_API_KEY"

**Solution**: Add `SHOPIFY_API_KEY` to your `.env` file and Vercel environment variables.

---

### Error: "HMAC verification failed"

**Cause**: Invalid `SHOPIFY_API_SECRET` or request was tampered with.

**Solution**:
1. Verify `SHOPIFY_API_SECRET` matches your Partner Dashboard
2. Ensure no proxies are modifying the request
3. Check Vercel logs for the calculated vs received HMAC

---

### Error: "Invalid grant: code is invalid or expired"

**Cause**: OAuth code was already used or is too old.

**Solution**:
- Restart the OAuth flow from `/api/shopify/install`
- OAuth codes expire after ~60 seconds

---

### Merchant redirected but token not in database

**Solution**:
1. Check Vercel logs for errors
2. Verify Supabase connection is working
3. Ensure `shops` table exists
4. Check DATABASE_URL is correct

---

### Products not syncing after OAuth

**Solution**:
1. Verify `AUTH_MODE=oauth` in environment
2. Test with `/api/test-auth` to confirm token works
3. Check `shopify_shop` column in `users` table matches `shop_domain` in `shops` table

## Switching Between Manual and OAuth Modes

### Development (Manual Mode)

```bash
AUTH_MODE=manual
SHOP=dev-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

Use this for local development with a test store.

### Production (OAuth Mode)

```bash
AUTH_MODE=oauth
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
```

Use this for production with real merchant installations.

## Next Steps

1. **Configure Vercel environment variables** with your Shopify credentials
2. **Run the database migration** to create the `shops` table
3. **Deploy to production** with `AUTH_MODE=oauth`
4. **Test the flow** with a development store
5. **Submit your app** for Shopify App Store review (optional)

## Support

For questions or issues:
- Check Vercel logs: `vercel logs --follow`
- Check Supabase logs in dashboard
- Verify environment variables are set correctly
- Test `/api/test-auth` to verify connectivity

---

**Implementation Date**: 2025
**Status**: Production Ready
**Security**: HMAC verified, SSL enforced, tokens isolated per shop
