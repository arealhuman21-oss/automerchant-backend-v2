# 🌐 Production URLs - Quick Reference

## Your Live App

### 🎯 Main Production URL (USE THIS!)
**https://automerchant.vercel.app**

This is your main production domain where users should go!

---

## Project Structure

You have **two Vercel projects**:

1. **Backend Project**: `automerchant-backend-v2`
   - Domain: https://automerchant-backend-v2.vercel.app
   - Handles: All API requests

2. **Frontend Project**: `frontend` (but domain is `automerchant.vercel.app`)
   - Domain: https://automerchant.vercel.app
   - Handles: User interface, landing page, admin panel

---

## How it Works

```
User visits → https://automerchant.vercel.app
                    ↓
                Frontend (React app)
                    ↓
        API calls to → https://automerchant-backend-v2.vercel.app/api/...
                    ↓
                Backend (Express + PostgreSQL)
```

---

## Important URLs

### For Users
- **Landing Page**: https://automerchant.vercel.app
- **Admin Panel**: https://automerchant.vercel.app (login as arealhuman21@gmail.com)

### For Development
- **Backend Health**: https://automerchant-backend-v2.vercel.app/api/health
- **Frontend Project**: "frontend" on Vercel (displays as automerchant.vercel.app)
- **Backend Project**: "automerchant-backend-v2" on Vercel

---

## Configuration Files

### Frontend `.env.production`
```
REACT_APP_API_URL=https://automerchant-backend-v2.vercel.app/api
REACT_APP_SUPABASE_URL=https://mfuqxntaivvqiajfgjtv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
```

### Backend Environment (set in Vercel dashboard)
```
DATABASE_URL=postgresql://...
NODE_ENV=production
AUTH_MODE=manual
SHOPIFY_REDIRECT_URI=https://automerchant.vercel.app/api/shopify/callback
```

---

## ✅ All Systems Go!

- ✅ Admin panel fixed and deployed
- ✅ Waitlist signup working
- ✅ Backend API responding
- ✅ Custom domain configured correctly

**Go to: https://automerchant.vercel.app to test everything!**
