# Manual Onboarding Guide - AutoMerchant Pricing AI

## Overview
This guide walks you through the complete process of manually onboarding paying customers to AutoMerchant using multiple Shopify Partner apps to bypass the custom distribution limit.

## Prerequisites
- You have run the database migration `003_shopify_apps_table.sql` in Supabase
- You have access to your admin email: `arealhuman21@gmail.com`
- You have multiple Shopify Partner Apps created (one per customer)

---

## Part 1: Setting Up Your Shopify Partner Apps

### Step 1.1: Create a New Shopify Partner App
1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Click **Apps** → **Create App**
3. Choose **Custom app**
4. Fill in:
   - **App name**: e.g., "AutoMerchant App 1", "AutoMerchant App 2", etc.
   - **App URL**: `https://automerchant.vercel.app`
   - **Allowed redirection URL(s)**: `https://automerchant.vercel.app/api/shopify/callback`

### Step 1.2: Configure App Settings
1. Under **App Setup** → **Configuration**:
   - Set **Scopes**: `read_products,write_products,read_orders,write_inventory`
   - Set **Distribution**: **Custom distribution**
   - **Embedded app**: No (uncheck this)

2. Save your app credentials:
   - **Client ID** (Shopify API Key)
   - **Client Secret** (Shopify API Secret)
   - **Shop Domain** (the specific store this app will be used for)

### Step 1.3: Repeat for Each Customer
- Create a separate Shopify Partner App for each customer/shop
- Custom distribution allows 2-3 installations per app
- For 5-15 customers, you'll need 5-15 separate apps

---

## Part 2: Accessing the Admin Panel

### Step 2.1: Login to Admin Panel
1. Go to **https://automerchant.vercel.app**
2. Click **Join Waitlist** (this triggers Google OAuth)
3. Sign in with your admin email: `arealhuman21@gmail.com`
4. You'll be automatically redirected to the **Admin Panel** (instead of the waitlist success page)

### Step 2.2: Admin Panel Overview
You'll see two tabs:
- **Shopify Apps**: Manage multiple Shopify Partner app credentials
- **Users**: Manage waitlist users and approvals

---

## Part 3: Adding a Shopify App to the System

### Step 3.1: Navigate to Admin Panel
1. Go to https://automerchant.vercel.app (login with `arealhuman21@gmail.com`)
2. Click the **Shopify Apps** tab
3. Click **+ Add App** button

### Step 3.2: Enter App Details
Fill in the form:
- **App Name**: Friendly name (e.g., "App for Customer ABC")
- **Shop Domain**: The store domain (e.g., `customerabc.myshopify.com`)
- **Client ID**: Your Shopify API Key from Step 1.2
- **Client Secret**: Your Shopify API Secret from Step 1.2

### Step 3.3: Save and Get Install Link
1. Click **Add App**
2. The app will be added to your list
3. You'll see it in the apps list with all details

---

## Part 4: Onboarding a Paying Customer

### Complete Customer Onboarding Flow

#### Step 4.1: Customer Pays via PayPal
1. Customer sends payment via PayPal
2. You receive their:
   - Email address
   - Shopify store domain (e.g., `theirstore.myshopify.com`)

#### Step 4.2: Add Customer to Users Table
Since you're manually onboarding, the customer may not be in the waitlist yet. You have two options:

**Option A: They join the waitlist first**
1. Send them https://automerchant.vercel.app
2. They click "Join Waitlist" and sign in with Google
3. You approve them in the Admin Panel → Users tab

**Option B: Manually add them**
1. Go to Supabase SQL Editor
2. Run:
   ```sql
   INSERT INTO users (email, password_hash, name, created_at)
   VALUES ('customer@email.com', 'oauth_user', 'Customer Name', NOW());
   ```

#### Step 4.3: Generate Install Link
1. In Admin Panel → **Shopify Apps** tab
2. Find the app you want to assign to this customer
3. Click **Copy Install Link** button
4. Enter the customer's email when prompted
5. The install link will be copied to your clipboard

The link format will be:
```
https://automerchant.vercel.app/api/shopify/install?shop=theirstore.myshopify.com&app_id=1&user_email=customer@email.com
```

#### Step 4.4: Send Install Link to Customer
1. Send the link via email/message to the customer
2. Include instructions:

**Email Template:**
```
Subject: AutoMerchant Pricing AI - Installation Link

Hi [Customer Name],

Thanks for signing up for AutoMerchant Pricing AI!

Please click the link below to install the app on your Shopify store:

[INSTALL LINK]

After installation, you'll be redirected to your dashboard where you can start optimizing your product pricing.

If you have any questions, feel free to reach out!

Best,
[Your Name]
```

#### Step 4.5: Customer Installs the App
1. Customer clicks the install link
2. They're redirected to Shopify's authorization page
3. They click "Install" to grant permissions
4. OAuth flow completes:
   - Access token is stored in database
   - Shop is linked to their email address
   - They're redirected to dashboard

#### Step 4.6: Verify Installation
Check in Supabase:
1. Go to **Table Editor** → **shops**
2. You should see a new row:
   - `shop_domain`: Customer's store
   - `access_token`: OAuth token
   - `user_id`: Linked to their user account
   - `installed_at`: Timestamp

---

## Part 5: Managing Multiple Apps

### Viewing All Apps
In Admin Panel → **Shopify Apps** tab, you can see:
- App Name
- Shop Domain
- Client ID
- Status (active/inactive)
- Created Date
- **Copy Install Link** button
- **Delete** button

### Deleting Apps
1. Click the red trash icon next to an app
2. Confirm deletion
3. App credentials are removed from database

### Important Notes
- Each app can handle 2-3 shops (Shopify custom distribution limit)
- Create one app per customer for best organization
- Apps can be reused if you delete old installations

---

## Part 6: Managing Users

### Viewing Waitlist Users
In Admin Panel → **Users** tab, you can see:
- User Email
- Name
- Approved Status
- Join Date

### Approving Users
1. Find the user in the list
2. Click the green **Check** icon
3. User is now approved and can access full features

### Removing Users
1. Find the user in the list
2. Click the red **Trash** icon
3. Confirm deletion
4. User and associated data are removed

---

## Part 7: Troubleshooting

### Customer Can't Install App
**Issue**: "The installation link for this app is invalid"

**Solution**: Make sure you're using Shopify's Custom Distribution install flow:
1. For custom distribution apps, the install link must match the shop domain exactly
2. The shop domain in the link must match the shop domain configured in Shopify Partner App settings

### Shop Not Linked to User
**Issue**: Shop installed but `user_id` is NULL in database

**Solution**:
1. Make sure you included `user_email` parameter in the install link
2. Verify the user exists in the `users` table
3. Check backend logs for any errors during OAuth callback

### Admin Panel Shows "CORS Error"
**Issue**: CORS policy blocking admin API calls

**Solution**:
- Backend has been updated with CORS headers
- If issue persists, verify the frontend URL matches the allowed origins in `backend/server.js`

### Can't Access Admin Panel
**Issue**: Logged in but see success page instead of admin panel

**Solution**:
- Verify you're using `arealhuman21@gmail.com`
- Clear browser cache and cookies
- Try incognito/private browsing mode

---

## Part 8: Scaling to More Customers

### For 5-15 Customers
- Create 5-15 Shopify Partner Apps
- Add all apps to Admin Panel
- Assign one app per customer

### Beyond 15 Customers
At this point, you'll need to:
1. Apply for **Public distribution** on Shopify
2. This requires:
   - $20 one-time fee to Shopify
   - App review process (1-2 weeks)
   - Public app listing

OR

3. Continue creating more Partner Apps (tedious but works)

---

## Part 9: Database Schema Reference

### shops table
```sql
- id: Serial primary key
- shop_domain: Store domain (e.g., store.myshopify.com)
- access_token: OAuth access token
- scope: Permission scopes granted
- user_id: Foreign key to users.id
- installed_at: Installation timestamp
- updated_at: Last update timestamp
- is_active: Boolean status
```

### shopify_apps table
```sql
- id: Serial primary key
- app_name: Friendly app name
- client_id: Shopify API Key
- client_secret: Shopify API Secret
- shop_domain: Which shop this app is for
- status: active/inactive
- created_at: Creation timestamp
- updated_at: Last update timestamp
```

### users table
```sql
- id: Serial primary key
- email: User email
- name: User name
- approved: Boolean (admin approval)
- created_at: Signup timestamp
```

---

## Part 10: Quick Reference Checklist

### Onboarding New Customer Checklist
- [ ] Customer pays via PayPal
- [ ] Collect customer email and shop domain
- [ ] Create new Shopify Partner App (if needed)
- [ ] Add app to Admin Panel
- [ ] Generate install link with customer email
- [ ] Send install link to customer
- [ ] Verify installation in Supabase
- [ ] Customer can now use the app!

### Monthly Maintenance
- [ ] Review active shops in database
- [ ] Remove inactive/canceled subscriptions
- [ ] Check for failed OAuth tokens
- [ ] Monitor app usage and performance

---

## Support

If you encounter any issues:

1. **Check Backend Logs**:
   ```bash
   npx vercel logs automerchant-backend-v2
   ```

2. **Check Database**:
   - Supabase Dashboard → Table Editor
   - Verify shops, users, shopify_apps tables

3. **Test OAuth Flow**:
   - Use your own test store first
   - Verify the complete flow works end-to-end

---

## Summary

**The complete flow is:**

1. Customer pays → You collect email + shop domain
2. Create Shopify Partner App → Add to Admin Panel
3. Generate install link with customer email
4. Customer installs → Shop linked to their account
5. Customer uses AutoMerchant Pricing AI!

**Admin Panel URL**: https://automerchant.vercel.app (login with arealhuman21@gmail.com)

**Everything is now automated through the admin panel - you just need to:**
- Create Shopify Partner Apps
- Add them to the system
- Send install links to customers

That's it! 🎉
