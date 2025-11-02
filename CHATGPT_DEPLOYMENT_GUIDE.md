# ChatGPT Deployment Guide - AutoMerchant AI

## CRITICAL: Updated Database Connection

**IMPORTANT:** The DATABASE_URL has been updated to use Supabase's connection pooler for Vercel compatibility.

---

## Component 1: Backend API

**Directory:** `backend/`

**Deploy Command:**
```bash
cd backend
vercel --prod
```

**Domain:** `api.automerchant.ai`

**Environment Variables (CRITICAL - USE THESE EXACT VALUES):**

```
SUPABASE_URL=https://mfuqxntaivvqiajfgjtv.supabase.co

DATABASE_URL=postgresql://postgres:Aatiaday2018!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXF4bnRhaXZ2cWlhamZnanR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTY5ODcsImV4cCI6MjA3NzU5Mjk4N30.RDI3p5xnlq3VNNkNzUQVi_xCUTkPBdqYbUrjve71E44

SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXF4bnRhaXZ2cWlhamZnanR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxNjk4NywiZXhwIjoyMDc3NTkyOTg3fQ.OiPFxNhHZARTwRMtGc6HyIfagftdNjMPGmBt_QmSWGk

JWT_SECRET=automerchant_production_secret_key_2024_secure_random_string

PORT=5000

NODE_ENV=production
```

**Build Settings:**
- Framework Preset: Other
- Build Command: (leave empty)
- Output Directory: (leave empty)
- Install Command: `npm install`

**VERIFY DEPLOYMENT:**
After deployment, check Vercel logs for:
```
✅ Supabase connected at [timestamp]
```

---

## Component 2: Frontend Dashboard

**Directory:** `frontend/`

**Deploy Command:**
```bash
cd frontend
vercel --prod
```

**Domain:** `automerchant.ai`

**Environment Variables:**
```
REACT_APP_API_URL=https://api.automerchant.ai
```

**Build Settings:**
- Framework Preset: Create React App
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

---

## Component 3: Embedded Shopify App

**Directory:** `embedded-app/`

**Deploy Command:**
```bash
cd embedded-app
vercel --prod
```

**Domain:** `embedded.automerchant.ai`

**Environment Variables:** None needed

**Build Settings:**
- Framework Preset: Other
- Build Command: (leave empty)
- Output Directory: `public`
- Install Command: (leave empty)

---

## Deployment Order

1. **Backend First** - Deploy backend and verify Supabase connection in logs
2. **Frontend Second** - Deploy frontend (connects to backend API)
3. **Embedded App Last** - Deploy embedded app (redirects to frontend)

---

## Post-Deployment Verification

### Check Backend Logs:
```
✅ Supabase connected at [timestamp]
```

### Test Endpoints:
- `https://api.automerchant.ai/` - Should respond
- `https://automerchant.ai/` - Should show landing page
- `https://embedded.automerchant.ai/` - Should show redirect page

---

## Troubleshooting

**If "Database connection failed":**
- Verify DATABASE_URL uses connection pooler: `pooler.supabase.com:6543`
- Check `?sslmode=require` is at the end
- Verify all environment variables are set in Vercel dashboard

---

## Testing After Deployment

1. Visit `https://automerchant.ai`
2. Click "Go to Main App"
3. Sign up for account
4. Settings → Connect Shopify
5. Enter dev store credentials
6. Sync products
7. Run analysis

**Project Location:** `C:\Users\ben_l\automerchant-local\`

Ready to deploy! 🚀
