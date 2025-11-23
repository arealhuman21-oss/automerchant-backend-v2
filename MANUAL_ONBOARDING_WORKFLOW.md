# Manual Onboarding Workflow for AutoMerchant

This guide explains the complete manual onboarding process for your pricing app customers.

## Overview

You'll manually create a Shopify Partner app for each customer, approve them in the admin panel, and send them a personalized install link. After they install, they'll automatically access the product.

---

## Step-by-Step Process

### Step 1: Create Shopify Partner App

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Click **Apps** → **Create app** → **Create app manually**
3. Fill in the app details:
   - **App name**: Something descriptive (e.g., "AutoMerchant - Customer 1")
   - **App URL**: `https://automerchant.vercel.app`
   - **Allowed redirection URL(s)**: `https://automerchant.vercel.app/api/shopify/callback`
4. In **Configuration** → **API access**:
   - Add these scopes: `read_products`, `write_products`, `read_orders`, `write_inventory`
5. Under **Distribution**:
   - Select **Custom distribution**
   - This allows you to control who installs the app
6. **Save** the app
7. Copy the following from Shopify:
   - **Client ID** (API Key)
   - **Client Secret** (API Secret Key)
   - **Install Link** (Shopify provides this in the Distribution section)

---

### Step 2: Add App to Admin Panel

1. Log into your admin panel at `https://automerchant.vercel.app/admin`
2. Go to the **Shopify Apps** tab
3. Click **+ Add App**
4. Fill in the form:
   - **App Name**: Friendly name (e.g., "Customer 1 Pricing App")
   - **Shop Domain**: Customer's Shopify store (e.g., `customer-store.myshopify.com`)
   - **Client ID**: Paste from Shopify Partner app
   - **Client Secret**: Paste from Shopify Partner app
   - **Shopify Install Link**: Paste the install link Shopify generated
5. Click **Add App**
6. ✅ The app is now saved in your database!

---

### Step 3: Approve User & Assign App

1. In the admin panel, go to the **Users** tab
2. Find the customer's email in the list
   - They'll appear as "Pending" with ⏳ status
3. Click the **Approve** button (green checkmark)
4. Once approved, a dropdown appears: **Assign Shopify App**
5. Select the app you just created for this customer
6. The user is now linked to their specific app!

---

### Step 4: Copy & Send Install Link

1. In the **Users** tab, find the approved user
2. Click **Copy Link** button next to their name
   - This generates a personalized link with their email and app assignment
3. The link will look like:
   ```
   https://partners.shopify.com/.../installations/...?user_email=customer@example.com
   ```
4. Send this link to the customer via email

**Email Template:**
```
Subject: Your AutoMerchant Account is Approved!

Hi [Customer Name],

Great news! Your AutoMerchant account has been approved.

Click the link below to install AutoMerchant on your Shopify store:

[PASTE INSTALL LINK HERE]

After clicking "Install" on Shopify's authorization page, you'll be automatically logged into AutoMerchant and can start optimizing your pricing immediately!

Best regards,
The AutoMerchant Team
```

---

### Step 5: Customer Installs & Accesses Product

What happens when the customer clicks the link:

1. **Shopify Authorization**: They see Shopify's app install page
2. **Customer Clicks "Install"**: Shopify authorizes the app
3. **OAuth Callback**: Our backend receives the authorization
4. **Token Storage**: Access token is saved to the database
5. **Approval Check**: Backend checks if user is approved
6. **Auto-Login**: If approved, redirects to product dashboard with auto-login
7. ✅ **Customer is in!** They can immediately use AutoMerchant

If the user is **NOT approved** when they install:
- They're redirected to the waitlist page
- They see: "Thanks for installing! Your account is pending approval."

---

## How App Assignment Works

### Database Structure

```
users table:
- id
- email
- assigned_app_id  → references shopify_apps(id)

shopify_apps table:
- id
- app_name
- client_id
- client_secret
- shop_domain
- install_url
```

### When You Assign an App

1. Admin panel updates: `users.assigned_app_id = app.id`
2. This links the user to their specific Shopify Partner app
3. When they install, the OAuth flow uses that app's credentials
4. Their store data syncs using that app's access token

---

## Important Notes

### Shopify Custom Distribution Limits
- Each custom distribution app can handle **2-3 shops maximum**
- For 5-15 customers → create **5-15 separate apps**
- Each customer gets their own dedicated app

### Why This Works
- ✅ Scales beyond Shopify's custom distribution limits
- ✅ Each customer has isolated credentials
- ✅ You control who installs via manual approval
- ✅ Customers get seamless auto-login experience

### Troubleshooting

**"Add App" button doesn't work:**
- Make sure all fields are filled, especially the Install URL
- Check browser console for errors
- Verify the Install URL is from Shopify (starts with `https://partners.shopify.com/`)

**User not redirected to product after install:**
- Check if user is approved in the Users tab
- Verify they have an assigned app
- Check backend logs for OAuth callback errors

**User sees "Pending approval" after install:**
- This is correct if they haven't been approved yet
- Approve them in admin panel, then they can login manually

---

## Quick Reference

| Step | Action | Tool |
|------|--------|------|
| 1 | Create Shopify Partner App | Shopify Partners Dashboard |
| 2 | Add app to system | Admin Panel → Shopify Apps tab |
| 3 | Approve user | Admin Panel → Users tab |
| 4 | Assign app to user | Admin Panel → Users tab dropdown |
| 5 | Copy install link | Admin Panel → Users tab "Copy Link" button |
| 6 | Send link to customer | Email |
| 7 | Customer installs | Shopify install page |
| 8 | Customer auto-logged in | AutoMerchant dashboard |

---

## Testing the Workflow

### Test with your own email:

1. Create a test Shopify Partner app
2. Add it to admin panel
3. Create a test user account (or use your own email)
4. Approve the user and assign the test app
5. Copy the install link
6. Open it in an incognito window
7. Click "Install" on Shopify
8. ✅ You should be automatically logged into the dashboard!

---

## Summary

You now have a complete manual onboarding system where:
- You control who gets access (via approval)
- Each customer has their own Shopify app (scales past limits)
- Customers get a seamless install experience (auto-login)
- All data is properly linked (user → app → shop)

This setup allows you to onboard 5-15 customers manually for your Shopify pricing app MVP!
