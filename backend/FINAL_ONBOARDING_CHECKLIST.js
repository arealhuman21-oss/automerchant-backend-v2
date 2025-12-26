require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'https://automerchant-backend-v2.vercel.app';
const FRONTEND_URL = 'https://automerchant.vercel.app';

async function finalOnboardingChecklist() {
  console.log('🔒 FINAL ONBOARDING CHECKLIST - AIRTIGHT VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Backend API: ${API_URL}`);
  console.log(`Frontend: ${FRONTEND_URL}\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let allChecksPassed = true;

  try {
    await client.connect();

    // ============================================
    // CHECK 1: Database integrity
    // ============================================
    console.log('✓ CHECK 1: Database Integrity');
    console.log('-'.repeat(70));

    // Verify sales tracking columns exist
    const columnsCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products'
      AND column_name IN ('total_sales_30d', 'revenue_30d', 'sales_velocity');
    `);

    if (columnsCheck.rows.length !== 3) {
      console.log('❌ FAILED: Sales tracking columns missing');
      allChecksPassed = false;
    } else {
      console.log('✅ Sales tracking columns exist (total_sales_30d, revenue_30d, sales_velocity)');
    }

    // ============================================
    // CHECK 2: User 7 data completeness
    // ============================================
    console.log('\n✓ CHECK 2: User 7 Data Completeness');
    console.log('-'.repeat(70));

    const user7Check = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE user_id = 7) as product_count,
        (SELECT COUNT(*) FROM products WHERE user_id = 7 AND total_sales_30d > 0) as products_with_sales,
        (SELECT COUNT(*) FROM products WHERE user_id = 7 AND cost_price IS NOT NULL AND cost_price > 0) as products_with_cost,
        (SELECT COUNT(*) FROM recommendations WHERE user_id = 7) as recommendation_count,
        (SELECT COUNT(*) FROM shops WHERE user_id = 7 AND is_active = true) as active_shops;
    `);

    const data = user7Check.rows[0];
    console.log(`Products: ${data.product_count}`);
    console.log(`Products with sales data: ${data.products_with_sales}`);
    console.log(`Products with cost prices: ${data.products_with_cost}`);
    console.log(`Active recommendations: ${data.recommendation_count}`);
    console.log(`Active Shopify shops: ${data.active_shops}`);

    if (data.product_count === 0 || data.recommendation_count === 0) {
      console.log('❌ FAILED: User 7 missing critical data');
      allChecksPassed = false;
    } else {
      console.log('✅ User 7 has complete data');
    }

    // ============================================
    // CHECK 3: Profit calculation accuracy
    // ============================================
    console.log('\n✓ CHECK 3: Profit Calculation Accuracy');
    console.log('-'.repeat(70));

    const profitCalc = await client.query(`
      SELECT
        p.title,
        p.price::numeric as current_price,
        r.recommended_price::numeric,
        p.cost_price::numeric,
        p.total_sales_30d,
        (r.recommended_price::numeric - p.cost_price::numeric) as rec_profit_per_sale,
        (p.price::numeric - p.cost_price::numeric) as current_profit_per_sale,
        ((r.recommended_price::numeric - p.cost_price::numeric) - (p.price::numeric - p.cost_price::numeric)) as additional_profit_per_sale,
        ((r.recommended_price::numeric - p.cost_price::numeric) - (p.price::numeric - p.cost_price::numeric)) * p.total_sales_30d as total_additional_profit
      FROM recommendations r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = 7;
    `);

    if (profitCalc.rows.length === 0) {
      console.log('❌ FAILED: No profit calculation data');
      allChecksPassed = false;
    } else {
      const row = profitCalc.rows[0];
      console.log(`Product: ${row.title}`);
      console.log(`Current Price: $${parseFloat(row.current_price).toFixed(2)}`);
      console.log(`Recommended Price: $${parseFloat(row.recommended_price).toFixed(2)}`);
      console.log(`Cost Price: $${parseFloat(row.cost_price).toFixed(2)}`);
      console.log(`Sales (30d): ${row.total_sales_30d} units`);
      console.log(`Current Profit/Sale: $${parseFloat(row.current_profit_per_sale).toFixed(2)}`);
      console.log(`Recommended Profit/Sale: $${parseFloat(row.rec_profit_per_sale).toFixed(2)}`);
      console.log(`Additional Profit/Sale: $${parseFloat(row.additional_profit_per_sale).toFixed(2)}`);
      console.log(`💰 Total Additional Profit (30d): $${parseFloat(row.total_additional_profit).toFixed(2)}`);

      const expectedProfit = 3333.75;
      const actualProfit = parseFloat(row.total_additional_profit);

      if (Math.abs(actualProfit - expectedProfit) < 0.01) {
        console.log(`✅ Profit calculation is CORRECT ($${actualProfit.toFixed(2)})`);
      } else {
        console.log(`❌ FAILED: Profit mismatch. Expected $${expectedProfit}, got $${actualProfit.toFixed(2)}`);
        allChecksPassed = false;
      }
    }

    // ============================================
    // CHECK 4: API endpoints functional
    // ============================================
    console.log('\n✓ CHECK 4: API Endpoints Functional');
    console.log('-'.repeat(70));

    const authToken = jwt.sign(
      { id: 7, email: 'benjamincao98@gmail.com' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    try {
      const statsResponse = await axios.get(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const profitIncrease = parseFloat(statsResponse.data.profitIncrease);
      console.log(`/api/stats returns: profitIncrease = $${profitIncrease}`);

      if (profitIncrease === 3333.75) {
        console.log('✅ /api/stats endpoint returning correct profit increase');
      } else {
        console.log(`⚠️  WARNING: Expected $3333.75, got $${profitIncrease}`);
      }

      const recsResponse = await axios.get(`${API_URL}/api/recommendations`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const recCount = recsResponse.data.recommendations.length;
      console.log(`/api/recommendations returns: ${recCount} recommendation(s)`);

      if (recCount > 0) {
        console.log('✅ /api/recommendations endpoint working');
      } else {
        console.log('❌ FAILED: No recommendations returned from API');
        allChecksPassed = false;
      }

    } catch (error) {
      console.log(`❌ FAILED: API request error: ${error.message}`);
      allChecksPassed = false;
    }

    // ============================================
    // CHECK 5: Security measures active
    // ============================================
    console.log('\n✓ CHECK 5: Security Measures Active');
    console.log('-'.repeat(70));

    // Check admin auth security
    const serverJsContent = require('fs').readFileSync('./backend/server.js', 'utf8');

    if (serverJsContent.includes('jwt.verify(token, JWT_SECRET)') &&
        serverJsContent.includes('authenticateAdmin')) {
      console.log('✅ Admin auth uses jwt.verify (signature verification)');
    } else {
      console.log('❌ FAILED: Admin auth not using signature verification');
      allChecksPassed = false;
    }

    if (serverJsContent.includes('express-rate-limit')) {
      console.log('✅ Rate limiting enabled');
    } else {
      console.log('❌ FAILED: Rate limiting not configured');
      allChecksPassed = false;
    }

    if (serverJsContent.includes("callback(new Error('Not allowed by CORS'))")) {
      console.log('✅ CORS configured to reject unknown origins');
    } else {
      console.log('⚠️  WARNING: CORS may be too permissive');
    }

    // ============================================
    // CHECK 6: Manual onboarding workflow
    // ============================================
    console.log('\n✓ CHECK 6: Manual Onboarding Workflow Ready');
    console.log('-'.repeat(70));

    const onboardingCheck = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE approved = true) as approved_users,
        COUNT(*) FILTER (WHERE approved = false) as pending_users
      FROM users;
    `);

    console.log(`Approved users: ${onboardingCheck.rows[0].approved_users}`);
    console.log(`Pending users: ${onboardingCheck.rows[0].pending_users}`);

    const appsCheck = await client.query(`
      SELECT COUNT(*) as app_count FROM shopify_apps WHERE status = 'active';
    `);

    console.log(`Active Shopify apps: ${appsCheck.rows[0].app_count}`);

    if (parseInt(appsCheck.rows[0].app_count) > 0) {
      console.log('✅ Shopify apps configured for onboarding');
    } else {
      console.log('⚠️  WARNING: No active Shopify apps (needed for customer onboarding)');
    }

    await client.end();

    // ============================================
    // FINAL VERDICT
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('🏁 FINAL VERDICT');
    console.log('='.repeat(70));

    if (allChecksPassed) {
      console.log('\n✅ ✅ ✅ SYSTEM IS AIRTIGHT - READY FOR MANUAL ONBOARDING ✅ ✅ ✅\n');
      console.log('📋 Customer Onboarding Workflow:');
      console.log('   1. Customer signs up at https://automerchant.vercel.app');
      console.log('   2. You approve them in Admin Panel');
      console.log('   3. Assign them a Shopify app');
      console.log('   4. Send them the install link');
      console.log('   5. They connect Shopify → Products sync automatically');
      console.log('   6. They set cost prices for products');
      console.log('   7. AI analyzes and generates recommendations');
      console.log('   8. They see AI Profit Increase on dashboard');
      console.log('   9. They approve/reject recommendations');
      console.log('   10. Prices update in Shopify automatically\n');

      console.log('💰 What customers will see:');
      console.log('   - AI Profit Increase: Real $ value based on their sales');
      console.log('   - ROI Calculator: Conservative/Moderate/Optimistic scenarios');
      console.log('   - Recommendation cards: With urgency, confidence, reasoning');
      console.log('   - One-click "Apply to Shopify" button\n');

      console.log('🚀 GO ONBOARD YOUR FIRST CUSTOMER!\n');
      process.exit(0);
    } else {
      console.log('\n❌ SOME CHECKS FAILED - FIX ISSUES BEFORE ONBOARDING\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

finalOnboardingChecklist();
