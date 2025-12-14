# Fix for AI Profit Increase and ROI Calculator Issues

## Root Cause Analysis

### Problem 1: AI Profit Increase Shows $0.00
**Root Cause:** The `/api/stats` endpoint calculates profit increase based on `products.total_sales_30d` column (backend/server.js:2388), but this column is missing from the products table schema.

**What Happens:**
- When products are synced, the code tries to save `total_sales_30d`, `revenue_30d`, and `sales_velocity` (backend/server.js:1319-1321)
- But these columns don't exist in the database
- The upsert fails silently or ignores these fields
- When calculating profit increase, `total_sales_30d` is NULL or 0
- Profit calculation: `additionalProfit = (recommended_price - current_price) * total_sales_30d`
- Result: `additionalProfit = X * 0 = 0`

### Problem 2: ROI Calculator Shows 0 Active Recommendations
**Root Cause:** Either no recommendations exist, or all recommendations were applied/rejected (which deletes them from the database).

**What Happens:**
- The ROI calculator shows `recommendations.length` (ProductDashboard.jsx:1697, 1716)
- Recommendations are DELETED when applied (backend/server.js:2032-2037) or rejected (backend/server.js:1966-1970)
- If no new AI analysis has been run recently, there are no pending recommendations
- Result: Shows "0 active recommendations"

## Fix Steps

### Step 1: Add Missing Database Columns

Run this SQL in your Supabase SQL Editor:

```sql
-- Add sales tracking columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sales_30d INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS revenue_30d DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_velocity DECIMAL(10, 3) DEFAULT 0.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_total_sales_30d ON products(total_sales_30d DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('total_sales_30d', 'revenue_30d', 'sales_velocity', 'updated_at')
ORDER BY ordinal_position;
```

**Expected Result:** You should see 4 rows showing the new columns with their types.

### Step 2: Re-Sync Products from Shopify

This will populate the sales data for all products:

1. Log into your app at https://automerchant.vercel.app
2. Make sure you're connected to Shopify
3. The products should auto-sync when you log in
4. OR manually trigger a sync by clicking "Refresh" or re-connecting Shopify

**What This Does:**
- Fetches all orders from the last 30 days from Shopify
- Calculates sales per product variant:
  - `total_sales_30d`: Total units sold
  - `revenue_30d`: Total revenue from those sales
  - `sales_velocity`: Average units sold per day
- Saves this data to the products table

### Step 3: Set Cost Prices for Your Products

This is CRITICAL - AI won't create recommendations without cost prices:

1. Go to the Dashboard tab
2. Scroll to your products list
3. Click "Set Cost" for each product
4. Enter what YOU paid for the product (wholesale/manufacturing cost)
5. Save

**Why This Matters:**
- AI calculates potential profit: `(recommended_price - cost_price) * sales_30d`
- Without cost_price, the AI can't determine profitable price points
- AI will never recommend a price below your cost price

### Step 4: Run AI Analysis

1. Go to the Dashboard tab
2. Click the "Run AI Analysis Now" button
3. Wait for the analysis to complete (should take 10-30 seconds)
4. You should see new recommendations appear

**What Creates Recommendations:**
- Products WITH cost_price set
- Products WITH recent sales data (sales_30d > 0)
- AI identifies pricing opportunities based on:
  - Current price vs market positioning
  - Sales velocity
  - Profit margins
  - Competition (if detectable)

### Step 5: Verify the Fix

Check these metrics:

**Dashboard Tab:**
- "AI Profit Increase" should show a dollar amount > $0.00 (if you have recommendations)
- Recommendations should appear with urgency levels and profit projections

**ROI Calculator Tab:**
- "Active recommendations" should show count > 0
- "Potential Additional Profit" should show dollar amount > $0.00
- Conservative/Moderate/Optimistic scenarios should show projections

## Why You Might Still See $0.00

Even after the fix, you might see $0.00 if:

1. **No products have cost prices set** → AI can't calculate profit without knowing your costs
2. **Products have no sales in last 30 days** → `total_sales_30d = 0`, so profit projection is 0
3. **Prices are already optimal** → AI won't recommend changes if current pricing is good
4. **All recommendations were applied/rejected** → They get deleted from the database

## Understanding "AI Profit Increase"

This metric shows: **Potential additional profit per month IF you approve all pending recommendations**

**Formula:**
```
For each pending recommendation:
  current_profit_per_sale = current_price - cost_price
  recommended_profit_per_sale = recommended_price - cost_price
  additional_profit_per_sale = recommended_profit_per_sale - current_profit_per_sale
  additional_profit_30d = additional_profit_per_sale × total_sales_30d

Total AI Profit Increase = SUM(additional_profit_30d for all recommendations)
```

**Example:**
- Product: Widget
- Current price: $100
- Cost price: $60
- Current profit per sale: $40
- AI recommends: $120
- Recommended profit per sale: $60
- Additional profit per sale: $20
- Sales last 30 days: 10 units
- **AI Profit Increase: $20 × 10 = $200/month**

## Next Steps After Fix

1. **Test with Real Data:**
   - Set cost prices for at least 3 products with recent sales
   - Run AI analysis
   - Verify profit increase shows correctly

2. **Monitor Recommendations:**
   - Check if recommendations make business sense
   - Apply ones you agree with
   - Reject ones that don't fit your strategy

3. **Track Results:**
   - After applying recommendations, monitor actual sales
   - Compare to projections
   - Iterate based on real-world results

## Files Modified

- Created: `ADD_SALES_TRACKING_COLUMNS.sql`
- Backend logic already correct in: `backend/server.js:1319` (writes sales data)
- Backend logic already correct in: `backend/server.js:2382-2400` (calculates profit increase)
- Frontend display already correct in: `frontend/src/components/ProductDashboard.jsx:663-666` (shows profit)

## Database Schema Reference

After migration, products table will have:

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  shop_domain VARCHAR(255),
  app_id INTEGER,
  shopify_product_id VARCHAR(255),
  shopify_variant_id VARCHAR(255),
  title VARCHAR(255),
  price DECIMAL,
  cost_price DECIMAL,
  inventory INTEGER,
  image_url TEXT,
  total_sales_30d INTEGER DEFAULT 0,           -- NEW
  revenue_30d DECIMAL(10,2) DEFAULT 0.00,      -- NEW
  sales_velocity DECIMAL(10,3) DEFAULT 0.000,  -- NEW
  updated_at TIMESTAMP DEFAULT NOW(),          -- NEW
  created_at TIMESTAMP
);
```

## Verification Checklist

- [ ] SQL migration completed successfully
- [ ] Products re-synced from Shopify
- [ ] `total_sales_30d` column populated (check in Supabase dashboard)
- [ ] Cost prices set for products with sales
- [ ] AI analysis run successfully
- [ ] Recommendations visible on Dashboard tab
- [ ] "AI Profit Increase" shows amount > $0.00
- [ ] ROI Calculator shows "Active recommendations" > 0
- [ ] ROI Calculator shows profit projections > $0.00

## Troubleshooting

**If profit increase still shows $0.00 after migration:**

```bash
# Run this to check product sales data:
cd backend
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, price, cost_price, total_sales_30d, revenue_30d')
    .limit(10);

  if (error) console.error('Error:', error);
  else console.table(data);
})();
"
```

**Expected Output:**
- Should show products with `total_sales_30d > 0`
- Should show products with `cost_price` set
- If these are NULL or 0, re-sync products and set cost prices

## Ready for Customer Onboarding?

**After this fix:** Still NO - Security issues need to be addressed first (see Codex audit).

**Priority fixes before onboarding:**
1. ✅ AI Profit Increase calculation (this fix)
2. ✅ ROI Calculator display (this fix)
3. ❌ Admin auth vulnerability (CRITICAL)
4. ❌ Secrets in .env committed to repo (CRITICAL)
5. ❌ CORS/rate limiting disabled (HIGH)
6. ❌ Token/storage security (HIGH)
7. ❌ Shopify tokens in plaintext (MEDIUM)
8. ❌ No automated tests (MEDIUM)

**Recommendation:** Fix security issues next, then you can start onboarding.
