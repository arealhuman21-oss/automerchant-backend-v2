`

# AutoMerchant AI - Production Deployment Guide

## Overview

AutoMerchant AI is deployed as a multi-component SaaS platform:

1. **Frontend** (https://automerchant.ai) - React/Tailwind dashboard
2. **Backend API** (https://api.automerchant.ai) - Express.js + PostgreSQL
3. **Embedded App** (https://embedded.automerchant.ai) - Shopify redirect shell
4. **Database** - Supabase PostgreSQL

---

## Prerequisites

- Vercel account (for frontend and backend deployment)
- Supabase account (database already provisioned)
- Shopify Partner account
- Domain names configured

---

## Step 1: Database Setup (Supabase)

### Connection Details
- SUPABASE_URL: https://mfuqxntaivvqiajfgjtv.supabase.co
- DATABASE_URL: postgresql://postgres:***@db.mfuqxntaivvqiajfgjtv.supabase.co:5432/postgres

### Verify Schema
Run in Supabase SQL Editor to confirm all tables exist:
- users
- products
- recommendations
- price_changes
- manual_analyses
- analysis_schedule

---

## Step 2: Deploy Frontend

```bash
cd frontend
vercel --prod
```

Configure domain: automerchant.ai
Add environment variable: REACT_APP_API_URL=https://api.automerchant.ai

---

## Step 3: Deploy Backend

```bash
cd backend
vercel --prod
```

Configure domain: api.automerchant.ai
Add all Supabase environment variables from .env

---

## Step 4: Deploy Embedded App

```bash
cd embedded-app
vercel --prod
```

Configure domain: embedded.automerchant.ai

---

## Step 5: Configure Shopify Partner Dashboard

- App URL: https://embedded.automerchant.ai
- Allowed redirection URLs: 
  - https://automerchant.ai
  - https://automerchant.ai/dashboard
  - https://api.automerchant.ai/api/shopify/callback

---

## Verification Checklist

- [ ] Frontend loads at automerchant.ai
- [ ] Backend API responds at api.automerchant.ai
- [ ] Embedded app redirects correctly
- [ ] Shopify OAuth flow works
- [ ] Products sync from Shopify
- [ ] AI analysis generates recommendations
- [ ] Total AI Profit displays on dashboard
- [ ] Mobile responsiveness confirmed

---

Deployment Version: v1.0.0 (MVP)
`