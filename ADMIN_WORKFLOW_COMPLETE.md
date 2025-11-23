# 🎯 AutoMerchant - Complete Admin Workflow & System Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [User Workflow](#user-workflow)
3. [Admin Workflow](#admin-workflow)
4. [Technical Implementation](#technical-implementation)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Deployment Guide](#deployment-guide)

---

## 🌟 System Overview

AutoMerchant is an AI-powered dynamic pricing platform for Shopify merchants with a **manual approval system** for controlled access.

### Key Features:
- ✅ **Waitlist System** - Users sign up with Google OAuth
- ✅ **Manual Approval** - Admin approves each user individually
- ✅ **Multi-App Support** - One Shopify app per customer
- ✅ **User Management** - Approve, suspend, assign apps
- ✅ **AI Pricing Engine** - Fully functional pricing recommendations
- ✅ **Admin Dashboard** - Complete user & app management

---

## 👥 User Workflow

### Step 1: User Joins Waitlist
1. User visits https://automerchant.vercel.app
2. Clicks "Join the Waitlist"
3. Signs in with Google OAuth
4. Automatically added to waitlist with `approved=false`
5. Sees "Awaiting Approval" message

### Step 2: Admin Approves User
1. Admin logs into Admin Panel
2. Reviews user in "User Management" tab
3. Clicks "Approve" button
4. Optionally assigns a Shopify app to the user

### Step 3: User Gets Access
1. User signs in again (same Google OAuth flow)
2. System checks approval status via `/api/check-approval`
3. If approved → receives auth token and access to full product
4. If not approved → sees "Awaiting Approval" message
5. If suspended → sees "Account Suspended" message

### Step 4: User Uses Product
Once approved, user has full access to:
- ✅ Sync Shopify products
- ✅ View AI pricing recommendations
- ✅ Apply price changes
- ✅ Analytics dashboard
- ✅ Order tracking

---

## 🛠️ Admin Workflow

### Creating a Shopify App for Each Customer

#### Step 1: Create Shopify Partner App
1. Go to https://partners.shopify.com
2. Create a new **custom app** for each customer
3. Configure the app:
   - **App URL:** `https://automerchant.vercel.app`
   - **Redirect URL:** `https://automerchant.vercel.app/api/shopify/callback`
   - **Scopes:** `read_products,write_products,read_orders,write_inventory`
   - **Distribution:** Custom distribution
4. Copy the **Client ID** and **Client Secret**
5. Copy the **install URL** Shopify generates

#### Step 2: Add App to Admin Panel
1. Open Admin Panel → "Shopify Apps" tab
2. Click "+ Add App"
3. Fill in the form:
   - App Name (e.g., "App for John's Store")
   - Shop Domain (customer's store)
   - Client ID (from Shopify)
   - Client Secret (from Shopify)
   - Shopify Install Link (from Shopify Partners)
4. Click "Add App"
5. App is now saved with install link

#### Step 3: Approve User & Assign App
1. Go to "User Management" tab
2. Find the user
3. Click "Approve"
4. Use dropdown to assign the Shopify app
5. User now linked to their specific app

#### Step 4: Send Install Link to Customer
1. Copy the install link from the app card
2. Send to customer via email:
   ```
   Hi [Customer],

   Your AutoMerchant account has been approved!

   Click this link to install the app on your Shopify store:
   [INSTALL LINK]

   After installation, sign in at https://automerchant.vercel.app

   Thanks!
   ```

### Managing Users

#### Approve User
- **Action:** Click "Approve" button
- **Effect:** User can access product on next sign-in
- **API:** `POST /api/admin/users/:id/approve`

#### Suspend User
- **Action:** Click "Suspend" button
- **Effect:** User blocked from accessing product
- **API:** `POST /api/admin/users/:id/suspend`

#### Unsuspend User
- **Action:** Click "Unsuspend" button
- **Effect:** User can access product again
- **API:** `POST /api/admin/users/:id/unsuspend`

#### Assign App
- **Action:** Select app from dropdown
- **Effect:** User's data syncs from that specific Shopify app
- **API:** `POST /api/admin/users/:id/assign-app`

#### Delete User
- **Action:** Click "Delete" button
- **Effect:** User removed from system entirely
- **API:** `DELETE /api/admin/users/:id`

### Viewing Stats
The admin panel shows live stats:
- 📊 **Total Users** - All users in system
- ✅ **Approved Users** - Users with access
- ⏳ **Pending Users** - Awaiting approval
- 🚫 **Suspended Users** - Blocked users
- 📱 **Total Apps** - Active Shopify apps

---

## 🔧 Technical Implementation

### Backend Changes (server.js)

#### New Database Columns
```sql
ALTER TABLE users
ADD COLUMN approved BOOLEAN DEFAULT false,
ADD COLUMN suspended BOOLEAN DEFAULT false,
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN suspended_at TIMESTAMP,
ADD COLUMN assigned_app_id INTEGER REFERENCES shopify_apps(id);
```

#### New API Endpoints
1. **Check Approval Status**
   ```javascript
   POST /api/check-approval
   Body: { email }
   Response: { approved, suspended, pending, token?, message }
   ```

2. **Admin Stats**
   ```javascript
   GET /api/admin/stats
   Response: { totalUsers, approvedUsers, pendingUsers, suspendedUsers, totalApps }
   ```

3. **Approve User**
   ```javascript
   POST /api/admin/users/:id/approve
   Response: { success, user }
   ```

4. **Suspend User**
   ```javascript
   POST /api/admin/users/:id/suspend
   Response: { success, user }
   ```

5. **Unsuspend User**
   ```javascript
   POST /api/admin/users/:id/unsuspend
   Response: { success, user }
   ```

6. **Assign App**
   ```javascript
   POST /api/admin/users/:id/assign-app
   Body: { appId }
   Response: { success, user }
   ```

#### Updated Login Flow
```javascript
app.post('/api/login', ...)
// Checks:
// 1. User exists
// 2. Not suspended
// 3. Approved
// 4. Valid password
// Returns token + user info
```

### Frontend Changes

#### AdminPanel.jsx
- **Stats Cards** - Shows live user/app metrics
- **Enhanced User List** - Status badges (Approved/Pending/Suspended)
- **Action Buttons** - Approve, Suspend, Unsuspend, Delete
- **App Assignment** - Dropdown to assign Shopify apps
- **Auto Refresh** - Stats refresh after user actions

#### Waitlist.jsx
- **Approval Check** - Calls `/api/check-approval` after OAuth
- **Auto-Login** - If approved, stores token and redirects to dashboard
- **Status Messages** - Shows pending/suspended/approved status
- **Seamless Flow** - User doesn't need separate login after approval

---

## 📡 API Endpoints Reference

### Public Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/register` | POST | No | Register new user |
| `/api/login` | POST | No | Login (checks approval) |
| `/api/check-approval` | POST | No | Check user approval status |
| `/api/shopify/install` | GET | No | OAuth install flow |
| `/api/shopify/callback` | GET | No | OAuth callback |

### Admin Endpoints (Requires Admin Token)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | Get all users with status |
| `/api/admin/users/:id/approve` | POST | Approve user |
| `/api/admin/users/:id/suspend` | POST | Suspend user |
| `/api/admin/users/:id/unsuspend` | POST | Unsuspend user |
| `/api/admin/users/:id/assign-app` | POST | Assign Shopify app |
| `/api/admin/users/:id` | DELETE | Delete user |
| `/api/admin/stats` | GET | Get admin dashboard stats |
| `/api/admin/apps` | GET | Get all Shopify apps |
| `/api/admin/apps` | POST | Create Shopify app |
| `/api/admin/apps/:id` | DELETE | Delete Shopify app |

### User Endpoints (Requires Auth Token)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | Get user's products |
| `/api/products/sync` | POST | Sync from Shopify |
| `/api/recommendations` | GET | Get AI recommendations |
| `/api/price-changes/apply` | POST | Apply price change |
| `/api/analytics/dashboard` | GET | Get analytics |

---

## 💾 Database Schema

### `users` Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  shopify_shop VARCHAR(255),
  shopify_access_token TEXT,
  approved BOOLEAN DEFAULT false,           -- NEW
  suspended BOOLEAN DEFAULT false,          -- NEW
  approved_at TIMESTAMP,                    -- NEW
  suspended_at TIMESTAMP,                   -- NEW
  assigned_app_id INTEGER REFERENCES shopify_apps(id),  -- NEW
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `shopify_apps` Table
```sql
CREATE TABLE shopify_apps (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_secret TEXT NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  install_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `waitlist_emails` Table (Supabase)
```sql
CREATE TABLE waitlist_emails (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Deployment Guide

### Backend Deployment (Vercel)
```bash
cd backend
vercel --prod
```

### Frontend Deployment (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
AUTH_MODE=oauth
SHOPIFY_REDIRECT_URI=https://automerchant.vercel.app/api/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_inventory
```

#### Frontend (.env.local)
```env
REACT_APP_API_URL=https://automerchant-backend-v2.vercel.app/api
REACT_APP_SUPABASE_URL=https://...supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
```

### Post-Deployment Checklist
- ✅ Run database migration: `005_user_approval_system.sql`
- ✅ Set up Supabase RLS policies for `waitlist_emails`
- ✅ Test waitlist signup flow
- ✅ Test admin approval flow
- ✅ Test user login after approval
- ✅ Test Shopify OAuth flow
- ✅ Test admin panel CORS

---

## 📝 Logs & Console Output

### Backend Logs
All admin actions are logged with emojis for easy debugging:

```
✅ [ADMIN] User email@example.com approved successfully
🚫 [ADMIN] User email@example.com suspended successfully
🔗 [ADMIN] App 5 assigned to user email@example.com
📊 [ADMIN] Stats: { totalUsers: 10, approvedUsers: 5, ... }
🔐 [LOGIN] User email@example.com approved, logging in
⏳ [LOGIN] User email@example.com not approved yet
🔍 [CHECK-APPROVAL] Checking status for: email@example.com
```

### Frontend Logs
Check browser console for:
- Supabase OAuth flow
- API calls to backend
- Approval check results
- Admin panel actions

---

## 🎓 Summary

The complete flow is:

1. **User signs up** → Waitlist (pending approval)
2. **Admin creates Shopify app** → Stores in Admin Panel
3. **Admin approves user** → Assigns Shopify app
4. **User signs in again** → Gets access to full product
5. **User uses product** → AI pricing, analytics, etc.

The system is **fully functional** with:
- ✅ User approval/suspension
- ✅ Multi-app support
- ✅ Admin dashboard with stats
- ✅ Seamless OAuth flow
- ✅ Complete logging
- ✅ AI pricing engine (already built)

---

## 🔮 For Next Claude Session

If you need to resume this work, here's what was done:

### Database Changes
- Added `approved`, `suspended`, `approved_at`, `suspended_at`, `assigned_app_id` columns to `users` table
- Migration file: `backend/migrations/005_user_approval_system.sql`

### Backend Changes (server.js)
- Updated `/api/login` to check approval/suspension
- Added `/api/check-approval` endpoint
- Added admin endpoints: approve, suspend, unsuspend, assign-app, stats
- Added comprehensive logging with emojis

### Frontend Changes
- **AdminPanel.jsx**: Stats cards, approve/suspend buttons, app assignment dropdown
- **Waitlist.jsx**: Approval check after OAuth, auto-login if approved
- Enhanced UI with status badges (Approved/Pending/Suspended)

### Files Modified
1. `backend/server.js` - All admin endpoints & approval logic
2. `backend/migrations/005_user_approval_system.sql` - Database schema
3. `frontend/src/components/AdminPanel.jsx` - Enhanced admin UI
4. `frontend/src/components/Waitlist.jsx` - Approval check flow

### Deployment Status
- Backend: Ready to deploy
- Frontend: Ready to deploy
- Database migration: Completed

Everything is ready to deploy and test!
