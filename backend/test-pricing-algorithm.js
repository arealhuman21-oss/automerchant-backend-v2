// Test Pricing Algorithm Edge Cases

// Mock pricing algorithm function (copied from server.js)
async function analyzeProduct(product, allProducts = [], userSettings = {}, recentOrderData = {}, priceDecreaseHistory = {}) {
  const costPrice = parseFloat(product.cost_price) || 0;
  const currentPrice = parseFloat(product.price);
  const salesVelocity = parseFloat(product.sales_velocity) || 0;
  const inventory = parseInt(product.inventory) || 0;
  const sales30d = parseInt(product.total_sales_30d) || 0;
  const revenue30d = parseFloat(product.revenue_30d) || 0;
  const sales7d = parseInt(recentOrderData[`sales7d_${product.id}`]) || Math.floor(sales30d / 4.3);
  const recentVelocity = sales7d / 7;

  const decreasesThisMonth = priceDecreaseHistory[product.id] || 0;
  const daysSinceLastAnalysis = product.last_analyzed_at
    ? (Date.now() - new Date(product.last_analyzed_at)) / (1000 * 60 * 60 * 24)
    : 999;

  console.log(`   [TEST] Product: ${product.title}`);
  console.log(`   [TEST] Cost: $${costPrice}, Price: $${currentPrice}, Sales 30d: ${sales30d}`);

  // CRITICAL: No cost price set
  if (costPrice <= 0) {
    console.log(`   [TEST] ❌ SKIPPED: No cost price set\n`);
    return { shouldChangePrice: false, error: 'Cost price required' };
  }

  const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
  const currentProfit = currentPrice - costPrice;

  const MIN_MARGIN_PERCENT = 30;
  const TARGET_MARGIN = parseFloat(userSettings.target_margin) || 40;

  // CRITICAL SAFEGUARD: Selling BELOW cost
  if (currentPrice < costPrice) {
    const emergencyPrice = costPrice * 1.5;
    const increasePercent = ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1);
    console.log(`   [TEST] 🚨 CRITICAL: Selling below cost! Recommending $${emergencyPrice.toFixed(2)} (+${increasePercent}%)\n`);
    return {
      shouldChangePrice: true,
      recommendedPrice: emergencyPrice,
      reasoning: `🚨 EMERGENCY: Currently selling BELOW cost! Cost: $${costPrice.toFixed(2)}, Price: $${currentPrice.toFixed(2)}. Raising to $${emergencyPrice.toFixed(2)} (+${increasePercent}%) to achieve 50% margin minimum and stop losses immediately.`,
      urgency: 'CRITICAL',
      confidence: 100
    };
  }

  // SAFEGUARD: Margin too low
  if (currentMargin < MIN_MARGIN_PERCENT) {
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.min(targetPrice, currentPrice * 1.20); // Max 20% increase
    const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);
    console.log(`   [TEST] 🛡️ MARGIN TOO LOW: ${currentMargin.toFixed(1)}% < ${MIN_MARGIN_PERCENT}%. Recommending $${cappedPrice.toFixed(2)} (+${increasePercent}%)\n`);
    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `🛡️ MARGIN TOO LOW: Current margin ${currentMargin.toFixed(1)}% is below healthy minimum of ${MIN_MARGIN_PERCENT}%. Raising price to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve ${TARGET_MARGIN}% target margin.`,
      urgency: 'HIGH',
      confidence: 95
    };
  }

  console.log(`   [TEST] ✅ Price is optimal: Margin ${currentMargin.toFixed(1)}% is healthy\n`);
  return {
    shouldChangePrice: false,
    reasoning: `✅ Price is optimal with ${currentMargin.toFixed(1)}% margin`,
    confidence: 90
  };
}

// Test Cases
const testCases = [
  {
    title: "User's reported issue - Price below cost",
    product: {
      id: 1,
      title: "Shirt (User's Test Case)",
      price: 62.50,
      cost_price: 100.00, // They meant $100, not $100,000
      inventory: 9999900,
      total_sales_30d: 0,
      sales_velocity: 0
    }
  },
  {
    title: "Extreme case - Massive price error",
    product: {
      id: 2,
      title: "Product with data entry error",
      price: 62.50,
      cost_price: 100000.00, // $100,000 cost with $62.50 price
      inventory: 100,
      total_sales_30d: 0,
      sales_velocity: 0
    }
  },
  {
    title: "No cost price set",
    product: {
      id: 3,
      title: "Product without cost",
      price: 50.00,
      cost_price: 0,
      inventory: 100,
      total_sales_30d: 5,
      sales_velocity: 0.5
    }
  },
  {
    title: "Healthy margin - should not recommend change",
    product: {
      id: 4,
      title: "Well-priced product",
      price: 100.00,
      cost_price: 60.00, // 40% margin
      inventory: 50,
      total_sales_30d: 10,
      sales_velocity: 1.0
    }
  },
  {
    title: "Margin too low (25%)",
    product: {
      id: 5,
      title: "Product with thin margin",
      price: 100.00,
      cost_price: 75.00, // 25% margin (below 30% minimum)
      inventory: 50,
      total_sales_30d: 5,
      sales_velocity: 0.5
    }
  }
];

// Run tests
async function runTests() {
  console.log('\n🧪 ============================================');
  console.log('   PRICING ALGORITHM EDGE CASE TESTS');
  console.log('============================================\n');

  for (const testCase of testCases) {
    console.log(`📋 TEST: ${testCase.title}`);
    console.log('─'.repeat(50));
    const result = await analyzeProduct(testCase.product);

    if (result.shouldChangePrice) {
      console.log(`   ✅ RECOMMENDATION CREATED`);
      console.log(`   Urgency: ${result.urgency}`);
      console.log(`   Confidence: ${result.confidence}%`);
      console.log(`   Price: $${testCase.product.price.toFixed(2)} → $${result.recommendedPrice.toFixed(2)}`);
      console.log(`   Reasoning: ${result.reasoning.substring(0, 100)}...`);
    } else {
      console.log(`   ℹ️  NO RECOMMENDATION: ${result.error || result.reasoning}`);
    }
    console.log('');
  }

  console.log('============================================');
  console.log('   ALL TESTS COMPLETED');
  console.log('============================================\n');
}

runTests();
