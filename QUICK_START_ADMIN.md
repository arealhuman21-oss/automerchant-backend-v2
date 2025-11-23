# Quick Start - Admin Panel Manual Onboarding

## 🚀 Onboard a New Customer (5 Minutes)

### 1. Create Shopify Partner App
Go to: https://partners.shopify.com

```
1. Apps → Create app → Create app manually
2. App name: "AutoMerchant - [Customer Name]"
3. App URL: https://automerchant.vercel.app
4. Redirect URL: https://automerchant.vercel.app/api/shopify/callback
5. Scopes: read_products, write_products, read_orders, write_inventory
6. Distribution: Custom distribution
7. Copy: Client ID, Client Secret, Install Link
```

### 2. Add to Admin Panel
Go to: https://automerchant.vercel.app/admin

```
1. Click "Shopify Apps" tab
2. Click "+ Add App"
3. Paste:
   - App Name: "Customer [Name]"
   - Shop Domain: customer-store.myshopify.com
   - Client ID: [from Shopify]
   - Client Secret: [from Shopify]
   - Install Link: [from Shopify]
4. Click "Add App"
```

### 3. Approve & Assign
```
1. Click "Users" tab
2. Find user email → Click "Approve" ✓
3. Select app from dropdown
4. Click "Copy Link" button
```

### 4. Send to Customer
```
Subject: Your AutoMerchant Account is Ready!

Hi [Name],

Your account is approved! Install AutoMerchant here:
[PASTE THE LINK YOU COPIED]

Click "Install" and you'll be automatically logged in.

Thanks!
```

### 5. Done!
Customer clicks link → Installs app → Auto-logged in to dashboard ✅

---

## 📊 Admin Panel Overview

### Shopify Apps Tab
- **Add App**: Create new app credentials
- **View Apps**: See all configured apps
- **Copy Link**: Get install link for any app
- **Delete**: Remove unused apps

### Users Tab
- **Approve**: Grant access to pending users
- **Assign App**: Link user to specific Shopify app
- **Copy Link**: Get personalized install link
- **Suspend**: Temporarily block access
- **Delete**: Remove user permanently

### Setup Guide Tab
- Step-by-step instructions
- Email templates
- Best practices

---

## 🔍 User States

| State | Badge | Meaning | Action |
|-------|-------|---------|--------|
| ⏳ Pending | Yellow | Awaiting approval | Click "Approve" |
| ✓ Approved | Green | Can access product | Assign app + send link |
| 🚫 Suspended | Red | Access blocked | Click "Unsuspend" to restore |

---

## ⚙️ How It Works

```
1. Customer signs up → User created (pending)
2. You approve → User approved (no app yet)
3. You assign app → User linked to Shopify app
4. You send link → Customer receives install URL
5. Customer clicks → Shopify authorization
6. Customer installs → OAuth completes
7. Backend checks → User is approved ✓
8. Redirect → Auto-login to dashboard
9. Customer uses product → Success! 🎉
```

---

## 💡 Key Points

✅ **One app per customer** (Shopify custom distribution limit)
✅ **Approve before assigning** (workflow order)
✅ **Copy link after assigning** (includes email + app_id)
✅ **Customer auto-logs in** (seamless experience)
✅ **Scales to 5-15 customers** (manual onboarding)

---

## 🐛 Troubleshooting

**"Add App" button doesn't work**
→ Make sure all fields are filled, especially Install URL

**User not auto-logged in after install**
→ Check if approved and assigned in Users tab

**User sees "Pending approval" message**
→ That's correct - approve them in admin panel

**Can't find install link**
→ Shopify Partners → Your app → Distribution section

---

## 📝 Files You Created

```
✅ MANUAL_ONBOARDING_WORKFLOW.md - Complete guide
✅ ADMIN_PANEL_FIXES.md - Technical details
✅ QUICK_START_ADMIN.md - This file (quick reference)
```

---

## 🎯 Next Steps

1. Test the workflow with your own email first
2. Onboard your first real customer
3. Monitor backend logs for any issues
4. Scale to more customers as needed

**Admin Panel**: https://automerchant.vercel.app/admin
**Shopify Partners**: https://partners.shopify.com

---

You're all set! 🚀
