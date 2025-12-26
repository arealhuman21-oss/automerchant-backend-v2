// ============================================
// V3 PRICING ALGORITHM TEST SUITE
// ============================================

const { analyzeProductV3 } = require('../../analyzeProduct-v3.js');

// Test case 1: Basic product with good data
async function testBasicProduct() {
  console.log('\n🧪 TEST 1: Basic Product - High velocity, good margin');

  const product = {
    id: 1,
    title: 'Wireless Headphones',
    price: 79.99,
    cost_price: 45.00,
    inventory: 150,
    total_sales_30d: 60,
    revenue_30d: 4799.40
  };

  const recentOrderData = {
    'sales7d_1': 15
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency
  });

  return result;
}

// Test case 2: Low margin product (needs price increase)
async function testLowMarginProduct() {
  console.log('\n🧪 TEST 2: Low Margin Product - Needs price increase');

  const product = {
    id: 2,
    title: 'Coffee Mug',
    price: 15.00,
    cost_price: 12.00,
    inventory: 200,
    total_sales_30d: 90,
    revenue_30d: 1350.00
  };

  const recentOrderData = {
    'sales7d_2': 21
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    currentMargin: ((15 - 12) / 15 * 100).toFixed(1) + '%'
  });

  return result;
}

// Test case 3: Excess inventory (needs price decrease to clear)
async function testExcessInventory() {
  console.log('\n🧪 TEST 3: Excess Inventory - Needs clearance');

  const product = {
    id: 3,
    title: 'Winter Coat',
    price: 120.00,
    cost_price: 70.00,
    inventory: 500,
    total_sales_30d: 20,
    revenue_30d: 2400.00
  };

  const recentOrderData = {
    'sales7d_3': 4
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  const dos = 500 / (20 / 30);
  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    daysOfSupply: dos.toFixed(0) + ' days',
    regime: result.dosRegime || 'N/A'
  });

  return result;
}

// Test case 4: Low inventory (needs price increase to ration)
async function testLowInventory() {
  console.log('\n🧪 TEST 4: Low Inventory - Needs rationing');

  const product = {
    id: 4,
    title: 'Popular T-Shirt',
    price: 25.00,
    cost_price: 10.00,
    inventory: 15,
    total_sales_30d: 45,
    revenue_30d: 1125.00
  };

  const recentOrderData = {
    'sales7d_4': 12
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  const dos = 15 / (45 / 30);
  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    daysOfSupply: dos.toFixed(0) + ' days',
    regime: result.dosRegime || 'N/A'
  });

  return result;
}

// Test case 5: Below cost price (CRITICAL)
async function testBelowCost() {
  console.log('\n🧪 TEST 5: Below Cost Price - CRITICAL FIX');

  const product = {
    id: 5,
    title: 'Discounted Item',
    price: 8.00,
    cost_price: 10.00,
    inventory: 50,
    total_sales_30d: 30,
    revenue_30d: 240.00
  };

  const recentOrderData = {
    'sales7d_5': 7
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    lossPerUnit: (product.cost_price - product.price).toFixed(2)
  });

  return result;
}

// Test case 6: Optimal pricing (at target margin with healthy inventory)
async function testOptimalPricing() {
  console.log('\n🧪 TEST 6: Optimal Pricing - Should hold');

  const product = {
    id: 6,
    title: 'Optimized Product',
    price: 50.00,
    cost_price: 30.00,
    inventory: 100,
    total_sales_30d: 80,
    revenue_30d: 4000.00
  };

  const recentOrderData = {
    'sales7d_6': 19
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  const currentMargin = ((50 - 30) / 50 * 100).toFixed(1);
  const dos = 100 / (80 / 30);
  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    currentMargin: currentMargin + '%',
    targetMargin: '40%',
    daysOfSupply: dos.toFixed(0) + ' days'
  });

  return result;
}

// Test case 7: Product with price history (should have higher confidence)
async function testWithPriceHistory() {
  console.log('\n🧪 TEST 7: With Price History - Higher confidence');

  const product = {
    id: 7,
    title: 'Tested Product',
    price: 35.00,
    cost_price: 20.00,
    inventory: 120,
    total_sales_30d: 50,
    revenue_30d: 1750.00
  };

  const recentOrderData = {
    'sales7d_7': 12
  };

  const priceHistory = {
    7: [
      {
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        priceBefore: 30.00,
        priceAfter: 35.00,
        demandBefore: 2.0,
        demandAfter: 1.67,
        daysElapsed: 14
      }
    ]
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    priceHistory,
    {},
    {}
  );

  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    urgency: result.urgency,
    priceHistoryEntries: priceHistory[7].length,
    elasticityMean: result.elasticityMean?.toFixed(2),
    elasticityUncertainty: result.elasticityUncertainty?.toFixed(2)
  });

  return result;
}

// Test case 8: Very high inventory corruption detection
async function testInventoryCorruption() {
  console.log('\n🧪 TEST 8: Inventory Corruption - Should detect and hold');

  const product = {
    id: 8,
    title: 'Corrupted Inventory Data',
    price: 40.00,
    cost_price: 25.00,
    inventory: 999999,
    total_sales_30d: 10,
    revenue_30d: 400.00
  };

  const recentOrderData = {
    'sales7d_8': 2
  };

  const result = await analyzeProductV3(
    product,
    [product],
    { target_margin: 0.40 },
    recentOrderData,
    {},
    {},
    {}
  );

  const dos = 999999 / (10 / 30);
  console.log('📊 Result:', {
    shouldChange: result.shouldChangePrice,
    currentPrice: product.price,
    recommendedPrice: result.recommendedPrice,
    reasoning: result.reasoning?.substring(0, 150) + '...',
    confidence: result.confidence,
    rawDOS: dos.toFixed(0) + ' days'
  });

  return result;
}

// ============================================
// JEST TEST SUITE
// ============================================

describe('V3 Pricing Algorithm', () => {
  test('Basic Product - High velocity, good margin', async () => {
    const result = await testBasicProduct();
    expect(result.shouldChangePrice).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  test('Low Margin Product - Needs price increase', async () => {
    const result = await testLowMarginProduct();
    expect(result.shouldChangePrice).toBeDefined();
    expect(result.urgency).toBe('HIGH');
  });

  test('Excess Inventory - Needs clearance', async () => {
    const result = await testExcessInventory();
    expect(result.shouldChangePrice).toBeDefined();
  });

  test('Low Inventory - Needs rationing', async () => {
    const result = await testLowInventory();
    expect(result.shouldChangePrice).toBeDefined();
  });

  test('Below Cost Price - CRITICAL fix', async () => {
    const result = await testBelowCost();
    expect(result.shouldChangePrice).toBe(true);
    expect(result.urgency).toBe('CRITICAL');
    expect(result.confidence).toBe(100);
  });

  test('Optimal Pricing - Should hold', async () => {
    const result = await testOptimalPricing();
    expect(result.shouldChangePrice).toBe(false);
  });

  test('With Price History - Higher confidence', async () => {
    const result = await testWithPriceHistory();
    expect(result.confidence).toBeGreaterThan(60);
  });

  test('Inventory Corruption - Should detect and hold', async () => {
    const result = await testInventoryCorruption();
    expect(result.shouldChangePrice).toBe(false);
    expect(result.confidence).toBe(100);
  });
});
