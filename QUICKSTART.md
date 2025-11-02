# AutoMerchant AI - Quick Start Guide

## Local Development

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env file (already done)
npm start
```

Backend runs at: http://localhost:5000

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## Production Deployment

### Quick Deploy Commands

**Frontend:**
```bash
cd frontend
vercel --prod
```

**Backend:**
```bash
cd backend  
vercel --prod
```

**Embedded App:**
```bash
cd embedded-app
vercel --prod
```

---

## Key URLs

- **Frontend:** https://automerchant.ai
- **Backend API:** https://api.automerchant.ai
- **Embedded App:** https://embedded.automerchant.ai

---

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://mfuqxntaivvqiajfgjtv.supabase.co
DATABASE_URL=postgresql://postgres:***@db.mfuqxntaivvqiajfgjtv.supabase.co:5432/postgres
SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_KEY=***
JWT_SECRET=automerchant_production_secret_key_2024_secure_random_string
PORT=5000
NODE_ENV=production
```

### Frontend
```
REACT_APP_API_URL=https://api.automerchant.ai
```

---

## Testing

1. Visit https://automerchant.ai
2. Click "Go to Main App"
3. Sign up/Login
4. Go to Settings → Connect Shopify
5. Sync products
6. Select products for analysis
7. Run analysis
8. View AI profit on dashboard

---

## Project Structure

```
automerchant-local/
├── backend/           # Express.js API + Supabase
│   ├── server.js
│   ├── .env
│   └── vercel.json
├── frontend/          # React/Tailwind dashboard  
│   ├── src/
│   │   ├── App.old.js  # Main production UI
│   │   └── App.js      # Polaris version (backup)
│   └── vercel.json
└── embedded-app/      # Shopify redirect shell
    ├── public/
    │   └── index.html
    └── vercel.json
```

---

## Key Features

✅ Beautiful React/Tailwind UI (App.old.js)
✅ Supabase PostgreSQL database
✅ Shopify OAuth integration
✅ AI-powered pricing analysis
✅ Total AI Profit tracking
✅ Manual + automatic analysis
✅ Mobile responsive
✅ Production-ready CORS
✅ Redirect-only embedded app

---

