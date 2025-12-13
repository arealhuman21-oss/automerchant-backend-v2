const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugSalesData() {
  console.log('🔍 SALES DATA DEBUG TOOL\n');
  console.log('=' .repeat(80));

  const userId = 1; // ben's user ID
  const shop = process.env.SHOP;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  console.log(`\n📊 STEP 1: Products in Database`);
  console.log('=' .repeat(80));

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, title, shopify_variant_id, price, total_sales_30d, revenue_30d, sales_velocity')
    .eq('user_id', userId);

  if (productsError) {
    console.error('❌ Error fetching products:', productsError);
    return;
  }

  console.log(`Found ${products.length} products:\n`);
  products.forEach(p => {
    console.log(`  ${p.title}`);
    console.log(`    Variant ID: ${p.shopify_variant_id} (type: ${typeof p.shopify_variant_id})`);
    console.log(`    Total Sales (30d): ${p.total_sales_30d}`);
    console.log(`    Revenue (30d): $${p.revenue_30d || 0}`);
    console.log(`    Sales Velocity: ${p.sales_velocity || 0} units/day`);
    console.log(`    Status: ${(p.total_sales_30d || 0) > 0 ? '✅ HAS SALES' : '⚠️ ZERO SALES'}`);
    console.log();
  });

  console.log(`\n📦 STEP 2: Orders from Shopify (last 30 days)`);
  console.log('=' .repeat(80));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const ordersResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const orders = ordersResponse.data.orders || [];
    console.log(`Found ${orders.length} orders:\n`);

    const variantSales = {};
    const variantRevenue = {};
    let totalItems = 0;

    orders.forEach((order, idx) => {
      console.log(`  Order #${order.order_number} (${order.created_at.split('T')[0]}):`);
      order.line_items?.forEach(item => {
        const variantId = item.variant_id?.toString();
        const quantity = item.quantity || 0;
        const revenue = parseFloat(item.price) * quantity;

        console.log(`    - ${item.title} x${quantity} = $${revenue.toFixed(2)}`);
        console.log(`      Variant ID: ${variantId} (type: ${typeof item.variant_id})`);

        if (variantId) {
          variantSales[variantId] = (variantSales[variantId] || 0) + quantity;
          variantRevenue[variantId] = (variantRevenue[variantId] || 0) + revenue;
          totalItems += quantity;
        }
      });
      console.log();
    });

    console.log(`\n📊 STEP 3: Sales Aggregated by Variant ID`);
    console.log('=' .repeat(80));
    console.log(`Total items sold: ${totalItems}\n`);

    Object.keys(variantSales).forEach(variantId => {
      const sales = variantSales[variantId];
      const revenue = variantRevenue[variantId];
      const velocity = (sales / 30).toFixed(3);
      console.log(`  Variant ${variantId}:`);
      console.log(`    Sales: ${sales} units`);
      console.log(`    Revenue: $${revenue.toFixed(2)}`);
      console.log(`    Velocity: ${velocity} units/day`);
      console.log();
    });

    console.log(`\n🔍 STEP 4: Matching Variant IDs`);
    console.log('=' .repeat(80));

    const productVariantIds = new Set(products.map(p => p.shopify_variant_id));
    const orderVariantIds = new Set(Object.keys(variantSales));

    console.log(`Product variant IDs: ${[...productVariantIds].join(', ')}`);
    console.log(`Order variant IDs: ${[...orderVariantIds].join(', ')}\n`);

    // Find mismatches
    const inOrdersNotProducts = [...orderVariantIds].filter(id => !productVariantIds.has(id));
    const inProductsNotOrders = [...productVariantIds].filter(id => !orderVariantIds.has(id));

    if (inOrdersNotProducts.length > 0) {
      console.log('⚠️ Variant IDs in ORDERS but NOT in PRODUCTS:');
      inOrdersNotProducts.forEach(id => {
        console.log(`  - ${id} (${variantSales[id]} sales, $${variantRevenue[id].toFixed(2)})`);
      });
      console.log('\n❌ PROBLEM: Orders exist for products not in database!');
      console.log('   This means products were not synced properly.');
      console.log();
    }

    if (inProductsNotOrders.length > 0) {
      console.log('ℹ️ Variant IDs in PRODUCTS but NOT in ORDERS:');
      inProductsNotOrders.forEach(id => {
        const product = products.find(p => p.shopify_variant_id === id);
        console.log(`  - ${id} (${product.title})`);
      });
      console.log('\n✅ This is normal - these products have no sales in last 30 days.');
      console.log();
    }

    if (inOrdersNotProducts.length === 0 && inProductsNotOrders.length === 0) {
      console.log('✅ All variant IDs match perfectly!\n');
    }

    console.log(`\n🔍 STEP 5: Checking Why Sales = 0`);
    console.log('=' .repeat(80));

    products.forEach(product => {
      const variantId = product.shopify_variant_id;
      const dbSales = product.total_sales_30d || 0;
      const actualSales = variantSales[variantId] || 0;

      if (actualSales > 0 && dbSales === 0) {
        console.log(`\n❌ MISMATCH: ${product.title}`);
        console.log(`   Variant ID: ${variantId}`);
        console.log(`   Database shows: ${dbSales} sales`);
        console.log(`   Shopify orders show: ${actualSales} sales`);
        console.log(`   Revenue should be: $${variantRevenue[variantId].toFixed(2)}`);
        console.log(`   ⚠️ DATABASE IS OUT OF SYNC!`);
      } else if (actualSales > 0 && dbSales > 0) {
        if (actualSales !== dbSales) {
          console.log(`\n⚠️ PARTIAL SYNC: ${product.title}`);
          console.log(`   Database: ${dbSales} sales`);
          console.log(`   Shopify: ${actualSales} sales`);
          console.log(`   Difference: ${actualSales - dbSales} sales`);
        } else {
          console.log(`\n✅ CORRECT: ${product.title}`);
          console.log(`   Sales match: ${actualSales} units`);
        }
      } else if (actualSales === 0 && dbSales === 0) {
        console.log(`\nℹ️ NO SALES: ${product.title}`);
        console.log(`   Both database and Shopify show 0 sales (correct)`);
      }
    });

    console.log(`\n\n💡 RECOMMENDATIONS:`);
    console.log('=' .repeat(80));

    if (inOrdersNotProducts.length > 0) {
      console.log('1. ⚠️ Run product sync to add missing products:');
      console.log('   POST /api/products/sync');
      console.log();
    }

    const hasOutdatedData = products.some(p => {
      const actualSales = variantSales[p.shopify_variant_id] || 0;
      const dbSales = p.total_sales_30d || 0;
      return actualSales > 0 && dbSales === 0;
    });

    if (hasOutdatedData) {
      console.log('2. 🔄 Sales data is outdated. Run product sync to update:');
      console.log('   POST /api/products/sync');
      console.log();
      console.log('3. 🔍 Check that product sync is calculating sales correctly');
      console.log('   Look for logs showing "✅ Variant XXX: +YY units"');
      console.log();
    }

  } catch (error) {
    console.error('❌ Error fetching orders from Shopify:', error.response?.data || error.message);
  }
}

debugSalesData().catch(console.error);
