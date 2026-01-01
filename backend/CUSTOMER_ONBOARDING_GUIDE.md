# Customer Onboarding Guide

## Overview

This guide explains how to onboard a new customer to AutoMerchant using Shopify Custom Distribution apps.

---

## Step 1: Create Custom Distribution App in Shopify Partners

1. Go to **[Shopify Partners](https://partners.shopify.com)** → **Apps** → **Create app**
2. Choose **Create app manually**
3. Enter app name: `CustomerName - AutoMerchant` (use their name/company)
4. Configure URLs:
   - **App URL**: `https://automerchant-backend-v2.vercel.app`
   - **Allowed redirection URL(s)**: `https://automerchant-backend-v2.vercel.app/api/shopify/callback`
5. Click **Create app**
6. Go to **API credentials** tab
7. Copy the **Client ID** and **Client Secret** (you'll need these in Step 3)

---

## Step 2: Set Up Custom Distribution

1. In the app, go to **Distribution** tab
2. Select **Custom distribution**
3. Click **Choose store** and enter the customer's store domain
4. Click **Generate link** to get the install link
5. Save this link - you'll send it to the customer in Step 6

---

## Step 3: Add App Credentials to Database

Run this SQL in Supabase:

```sql
INSERT INTO shopify_apps (app_name, client_id, client_secret, shop_domain, status)
VALUES (
  'CustomerName App',           -- Friendly name for this customer
  'CLIENT_ID_FROM_STEP_1',      -- Client ID from Shopify Partners
  'CLIENT_SECRET_FROM_STEP_1',  -- Client Secret from Shopify Partners
  'customershop.myshopify.com', -- Customer's Shopify store domain
  'active'
);
```

**Important:** The `shop_domain` must match EXACTLY what Shopify uses (e.g., `storename.myshopify.com`)

---

## Step 4: Create User Account

Run this SQL in Supabase:

```sql
INSERT INTO users (email, approved, created_at)
VALUES ('customer@email.com', true, NOW());
```

Replace `customer@email.com` with the customer's Google account email (the one they'll use to sign in).

---

## Step 5: Send Install Link to Customer

Send the customer the install link from Step 2.

Example message:
```
Hi [Name],

Click this link to install AutoMerchant on your Shopify store:
[INSTALL LINK]

After installing, go to https://automerchant.vercel.app and sign in with Google using [their email].

Let me know if you have any questions!
```

---

## Step 6: Customer Installs App

When the customer clicks the install link:

1. They see Shopify's permission screen
2. They click **Install app**
3. OAuth automatically happens:
   - App redirects to get authorization
   - Shopify sends back access token
   - Token is saved to `shops` table
4. Customer is redirected to `https://automerchant.vercel.app/?oauth_success=true`

---

## Step 7: Link Shop to User

After the customer installs, run this command:

```bash
cd backend
node auto-link-shop.js customershop.myshopify.com customer@email.com
```

This links the shop to their user account.

---

## Step 8: Verify Setup

Check everything is connected:

```sql
-- Check shop has token and is linked to user
SELECT s.shop_domain, s.access_token IS NOT NULL as has_token, s.is_active, u.email
FROM shops s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.shop_domain = 'customershop.myshopify.com';
```

You should see:
- `has_token`: true
- `is_active`: true
- `email`: customer's email

---

## Step 9: Customer Logs In

Customer goes to **https://automerchant.vercel.app** and:
1. Clicks **Sign in with Google**
2. Uses their email from Step 4
3. Sees their Product Dashboard
4. Can sync products, run analysis, etc.

---

## Done!

The customer is now fully onboarded and can use AutoMerchant.

---

## Troubleshooting

### "No app credentials found"
- Make sure you added the app to `shopify_apps` table (Step 3)
- Verify `shop_domain` matches exactly

### "OAuth error: redirect_uri not whitelisted"
- Add `https://automerchant-backend-v2.vercel.app/api/shopify/callback` to Allowed redirection URLs in Shopify Partners

### Customer can't see their store
- Run `auto-link-shop.js` to link the shop to their user (Step 7)
- Make sure their email in `users` table matches their Google account

### Token not saved
- Check Vercel logs: `vercel logs automerchant-backend-v2`
- Verify client_id and client_secret are correct in `shopify_apps`

---

## Quick Reference Commands

```bash
# Link shop to user
node auto-link-shop.js storename.myshopify.com user@email.com

# Add access token manually (if needed)
node add-access-token.js storename.myshopify.com shpat_xxxxx

# Full onboarding (creates user + links shop)
node onboard-custom-app.js storename.myshopify.com user@email.com
```

---

## Why Custom Distribution Requires Per-Customer Credentials

With Custom Distribution apps, each customer gets their **own app** in Shopify Partners:

| Customer | client_id | client_secret |
|----------|-----------|---------------|
| Customer A | `abc123...` | `shpss_xxx...` |
| Customer B | `def456...` | `shpss_yyy...` |

**OAuth Security Flow:**
1. Customer clicks install link
2. Shopify sends callback with `shop` domain + `code`
3. Our backend looks up `client_id` + `client_secret` by `shop_domain`
4. We send credentials + code to Shopify
5. Shopify **verifies** we have the correct secret → proves we own the app
6. Shopify returns access token

**Why this matters:** If someone intercepted the callback, they couldn't get the token without the secret. This proves the request is from the legitimate app owner.

---

## FUTURE IMPROVEMENT: Auto-Pending Installs

**Current flow:** Admin must add credentials to `shopify_apps` BEFORE customer installs.

**Proposed improvement:** If a shop tries to install and we don't have credentials:

1. Save to `pending_installs` table:
   ```sql
   INSERT INTO pending_installs (shop_domain, attempted_at)
   VALUES ('newshop.myshopify.com', NOW());
   ```

2. Admin sees notification: "New shop wants to install!"

3. Admin creates app in Shopify Partners, adds credentials to `shopify_apps`

4. Customer clicks install link again → works!

**Benefits:**
- No need to know exact `shop_domain` ahead of time
- Customers can self-serve the first step
- Admin just needs to create the app and add credentials

**TODO:** Implement this in `auth.routes.js` callback handler.
