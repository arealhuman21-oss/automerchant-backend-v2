require('dotenv').config();
const { Client } = require('pg');

async function verifyFix() {
  console.log('🔍 Verifying Sales Data Fix\n');
  console.log('=' .repeat(60));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check 1: Verify columns exist
    console.log('📋 CHECK 1: Database Schema');
    console.log('-'.repeat(60));
    const schemaResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'products'
      AND column_name IN ('total_sales_30d', 'revenue_30d', 'sales_velocity')
      ORDER BY column_name;
    `);

    if (schemaResult.rows.length === 3) {
      console.log('✅ All sales tracking columns exist:');
      console.table(schemaResult.rows);
    } else {
      console.log('❌ Missing columns! Expected 3, found', schemaResult.rows.length);
      return;
    }

    // Check 2: Products with sales data
    console.log('\n📋 CHECK 2: Products with Sales Data');
    console.log('-'.repeat(60));
    const productsResult = await client.query(`
      SELECT
        id,
        title,
        price,
        cost_price,
        total_sales_30d,
        revenue_30d::text as revenue_30d,
        sales_velocity::text as sales_velocity
      FROM products
      ORDER BY total_sales_30d DESC
      LIMIT 10;
    `);

    if (productsResult.rows.length === 0) {
      console.log('⚠️  No products found in database');
      console.log('   → You need to connect Shopify and sync products first\n');
    } else {
      console.log(`Found ${productsResult.rows.length} products:\n`);
      console.table(productsResult.rows);

      const hasSalesData = productsResult.rows.some(p => p.total_sales_30d > 0);
      const hasCostPrices = productsResult.rows.some(p => p.cost_price && parseFloat(p.cost_price) > 0);

      if (!hasSalesData) {
        console.log('\n⚠️  WARNING: All products have 0 sales');
        console.log('   → Refresh your app to trigger product sync');
        console.log('   → OR manually re-connect Shopify\n');
      } else {
        console.log(`\n✅ ${productsResult.rows.filter(p => p.total_sales_30d > 0).length} products have sales data`);
      }

      if (!hasCostPrices) {
        console.log('\n⚠️  WARNING: No cost prices set');
        console.log('   → Set cost prices in the app for products with sales');
        console.log('   → AI needs cost prices to calculate profit\n');
      } else {
        console.log(`✅ ${productsResult.rows.filter(p => p.cost_price && parseFloat(p.cost_price) > 0).length} products have cost prices set`);
      }
    }

    // Check 3: Recommendations
    console.log('\n📋 CHECK 3: Active Recommendations');
    console.log('-'.repeat(60));
    const recsResult = await client.query(`
      SELECT
        r.id,
        p.title,
        p.price as current_price,
        r.recommended_price,
        r.urgency,
        r.confidence,
        p.total_sales_30d,
        p.cost_price,
        r.created_at
      FROM recommendations r
      JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
      LIMIT 10;
    `);

    if (recsResult.rows.length === 0) {
      console.log('⚠️  No active recommendations found');
      console.log('   → Run AI analysis in the app (click "Run AI Analysis Now")');
      console.log('   → Make sure products have cost prices set first\n');
    } else {
      console.log(`✅ Found ${recsResult.rows.length} active recommendations:\n`);
      console.table(recsResult.rows);
    }

    // Check 4: Calculate expected profit increase
    console.log('\n📋 CHECK 4: Expected AI Profit Increase');
    console.log('-'.repeat(60));

    if (recsResult.rows.length === 0) {
      console.log('Expected AI Profit Increase: $0.00');
      console.log('Reason: No active recommendations\n');
    } else {
      let totalProfitIncrease = 0;
      const calculations = [];

      recsResult.rows.forEach(rec => {
        const currentPrice = parseFloat(rec.current_price) || 0;
        const recommendedPrice = parseFloat(rec.recommended_price) || 0;
        const costPrice = parseFloat(rec.cost_price) || 0;
        const sales30d = parseInt(rec.total_sales_30d) || 0;

        const currentProfitPerSale = currentPrice - costPrice;
        const recommendedProfitPerSale = recommendedPrice - costPrice;
        const additionalProfitPerSale = recommendedProfitPerSale - currentProfitPerSale;
        const additionalProfit30d = additionalProfitPerSale * sales30d;

        totalProfitIncrease += additionalProfit30d;

        calculations.push({
          product: rec.title.substring(0, 30),
          current: `$${currentPrice.toFixed(2)}`,
          recommended: `$${recommendedPrice.toFixed(2)}`,
          sales: sales30d,
          increase: `$${additionalProfit30d.toFixed(2)}`
        });
      });

      console.table(calculations);
      console.log(`\n💰 Expected AI Profit Increase: $${totalProfitIncrease.toFixed(2)}/month`);
      console.log('   (This is what should show in the app Dashboard)\n');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));

    const summary = {
      '✅ Database Schema': 'Fixed - columns added',
      '📦 Products in DB': `${productsResult.rows.length} products`,
      '📈 Products with Sales': `${productsResult.rows.filter(p => p.total_sales_30d > 0).length} products`,
      '💵 Products with Costs': `${productsResult.rows.filter(p => p.cost_price && parseFloat(p.cost_price) > 0).length} products`,
      '🎯 Active Recommendations': `${recsResult.rows.length} recommendations`
    };

    Object.entries(summary).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('📋 ACTION ITEMS');
    console.log('='.repeat(60));

    if (productsResult.rows.length === 0) {
      console.log('1. ❌ Connect Shopify in your app');
      console.log('2. ❌ Wait for products to sync');
    } else if (!productsResult.rows.some(p => p.total_sales_30d > 0)) {
      console.log('1. ⚠️  Refresh your app to trigger product sync');
      console.log('   OR log out and log back in');
    } else if (!productsResult.rows.some(p => p.cost_price && parseFloat(p.cost_price) > 0)) {
      console.log('1. ⚠️  Set cost prices for products with sales');
      console.log('   (Click "Set Cost" button for each product)');
    } else if (recsResult.rows.length === 0) {
      console.log('1. ⚠️  Run AI analysis in the app');
      console.log('   (Click "Run AI Analysis Now" button)');
    } else {
      console.log('1. ✅ Everything looks good!');
      console.log('2. ✅ Check your app - AI Profit Increase should show the value above');
      console.log('3. ✅ ROI Calculator should show active recommendations');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyFix();
