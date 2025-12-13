// ============================================
// BACKEND PRICING ALGORITHM - RULE-COMPLIANT MVP
// ============================================
//
// ABSOLUTE RULES (NON-NEGOTIABLE):
// 1. Inventory may NEVER initiate a pricing decision
// 2. Data reliability must be evaluated BEFORE pricing logic
// 3. LOW reliability → PROTECTIVE ACTIONS ONLY
// 4. One product → one recommendation → one reason
// 5. Follow exact decision order: Safety → Mispricing → Otherwise (no change)

async function analyzeProduct(product, allProducts, userSettings, recentOrderData = {}, priceDecreaseHistory = {}) {

  // ============================================
  // STEP 1: PARSE RAW DATA
  // ============================================
  const costPrice = parseFloat(product.cost_price) || 0;
  const currentPrice = parseFloat(product.price);
  const salesVelocity = parseFloat(product.sales_velocity) || 0;
  const inventory = parseInt(product.inventory) || 0;
  const sales30d = parseInt(product.total_sales_30d) || 0;
  const revenue30d = parseFloat(product.revenue_30d) || 0;
  const sales7d = parseInt(recentOrderData[`sales7d_${product.id}`]) || Math.floor(sales30d / 4.3);

  const decreasesThisMonth = priceDecreaseHistory[product.id] || 0;
  const daysSinceLastAnalysis = product.last_analyzed_at
    ? (Date.now() - new Date(product.last_analyzed_at)) / (1000 * 60 * 60 * 24)
    : 999;

  console.log(`   [ALGORITHM] Parsed values: cost=$${costPrice}, price=$${currentPrice}`);
  console.log(`   [ALGORITHM] Sales data: 7d=${sales7d}, 30d=${sales30d}, velocity=${salesVelocity.toFixed(2)}/day`);

  // ============================================
  // STEP 2: DATA RELIABILITY CLASSIFICATION
  // ============================================
  // MUST happen BEFORE any pricing logic

  let dataReliability = 'HIGH';
  const reliabilityIssues = [];

  // LOW reliability if ANY are true:
  if (!costPrice || costPrice <= 0) {
    dataReliability = 'LOW';
    reliabilityIssues.push('cost_price missing or zero');
  }

  // Extremely low lifetime sales (less than 5 total)
  if (sales30d < 5 && revenue30d < 50) {
    dataReliability = 'LOW';
    reliabilityIssues.push('insufficient sales history (< 5 units)');
  }

  // Invalid inventory (negative, absurdly large, or clearly fake)
  if (inventory < 0 || inventory > 100000) {
    dataReliability = 'LOW';
    reliabilityIssues.push(`invalid inventory (${inventory})`);
  }

  // MEDIUM if some concerns but not critical
  if (dataReliability === 'HIGH' && sales30d < 20) {
    dataReliability = 'MEDIUM';
    reliabilityIssues.push('limited sales data (< 20 units)');
  }

  console.log(`   [DATA RELIABILITY] ${dataReliability} ${reliabilityIssues.length > 0 ? `(${reliabilityIssues.join(', ')})` : ''}`);

  // ============================================
  // STEP 3: LOW RELIABILITY → PROTECTIVE ONLY
  // ============================================
  if (dataReliability === 'LOW') {
    console.log(`   [ALGORITHM] ⚠️ LOW data reliability - PROTECTIVE ACTIONS ONLY`);

    // ALLOWED: Prevent selling below cost
    if (currentPrice < costPrice) {
      const emergencyPrice = costPrice * 1.5;
      const increasePercent = ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1);
      return {
        shouldChangePrice: true,
        recommendedPrice: emergencyPrice,
        reasoning: `🚨 EMERGENCY: Selling BELOW cost ($${currentPrice.toFixed(2)} < $${costPrice.toFixed(2)}). Raising to $${emergencyPrice.toFixed(2)} (+${increasePercent}%) to achieve 50% margin and stop losses. [Data reliability: LOW - protective action only]`,
        urgency: 'CRITICAL',
        confidence: 100,
        priceChange: emergencyPrice - currentPrice,
        changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
      };
    }

    // ALLOWED: Raise to minimum safe margin (25%)
    const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
    if (currentMargin < 25) {
      const safePrice = costPrice / (1 - 0.30); // 30% margin
      const cappedPrice = Math.min(safePrice, currentPrice * 1.20); // Max 20% increase
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);
      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `🛡️ MARGIN TOO LOW: Current ${currentMargin.toFixed(1)}% margin is below safe minimum. Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve 30% protective margin. [Data reliability: LOW - ${reliabilityIssues.join(', ')}]`,
        urgency: 'HIGH',
        confidence: 90,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    // FORBIDDEN with LOW data: decreases, experiments, aggressive increases
    console.log(`   [ALGORITHM] ✓ LOW reliability + safe margin → DO NOTHING`);
    return {
      shouldChangePrice: false,
      reasoning: `⚠️ INSUFFICIENT DATA: Cannot make confident pricing recommendation due to: ${reliabilityIssues.join(', ')}. Current price $${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin) appears safe. Need more sales history for optimization.`,
      confidence: 40
    };
  }

  // ============================================
  // STEP 4: CALCULATE PRICING VARIABLES
  // ============================================
  const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
  const currentMarkup = currentPrice / costPrice;

  // CONFIGURATION
  const MIN_MARGIN_PERCENT = 30;
  const MAX_MARGIN_PERCENT = 70;
  const TARGET_MARGIN = parseFloat(userSettings.target_margin) || 40;
  const MAX_MARKUP_RATIO = 5.0;
  const SUSPICIOUS_MARKUP = 10.0;
  const MAX_INCREASE_PERCENT = 0.20; // 20%
  const MAX_DECREASE_PERCENT = 0.25; // 25%
  const ZERO_SALES_THRESHOLD_7D = 0;

  console.log(`   [ALGORITHM] Margin: ${currentMargin.toFixed(1)}%, Markup: ${currentMarkup.toFixed(1)}x`);

  // ============================================
  // STEP 5: PRICING DECISION ORDER (DO NOT VIOLATE)
  // ============================================

  // ------------------------------------------
  // DECISION ORDER 1: SAFETY CHECKS
  // ------------------------------------------

  // Safety Check A: Selling BELOW cost
  if (currentPrice < costPrice) {
    console.log(`   [ALGORITHM] 🚨 SAFETY VIOLATION: Below cost`);
    const emergencyPrice = costPrice * 1.5;
    const increasePercent = ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: emergencyPrice,
      reasoning: `🚨 CRITICAL: Selling BELOW cost! Cost: $${costPrice.toFixed(2)}, Price: $${currentPrice.toFixed(2)}. Raising to $${emergencyPrice.toFixed(2)} (+${increasePercent}%) to achieve 50% margin and stop losses immediately.`,
      urgency: 'CRITICAL',
      confidence: 100,
      priceChange: emergencyPrice - currentPrice,
      changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
    };
  }

  // Safety Check B: Margin dangerously low
  if (currentMargin < MIN_MARGIN_PERCENT) {
    console.log(`   [ALGORITHM] 🛡️ SAFETY: Margin too low (${currentMargin.toFixed(1)}%)`);
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.min(targetPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
    const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

    // Inventory can only REINFORCE this decision (add minor confidence boost)
    // It CANNOT initiate or determine price magnitude
    let inventoryNote = '';
    if (inventory < 30 && salesVelocity > 0.5) {
      inventoryNote = ' Low stock reinforces this protective action.';
    }

    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `🛡️ MARGIN TOO LOW: Current margin ${currentMargin.toFixed(1)}% is below healthy minimum of ${MIN_MARGIN_PERCENT}%. Raising price to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve ${TARGET_MARGIN}% target margin while staying within ${MAX_INCREASE_PERCENT * 100}% max increase limit.${inventoryNote}`,
      urgency: 'HIGH',
      confidence: 95,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  // ------------------------------------------
  // DECISION ORDER 2: OBVIOUS MISPRICING
  // ------------------------------------------

  // Mispricing A: Zero sales for 7+ days (with sufficient data quality)
  if (sales7d === 0 && daysSinceLastAnalysis >= 7 && dataReliability === 'HIGH') {
    console.log(`   [ALGORITHM] 📉 MISPRICING: Zero sales for 7+ days`);

    // PROTECTION: Max 3 decreases per month
    if (decreasesThisMonth >= 3) {
      console.log(`   [ALGORITHM] ⚠️ BLOCKED: Price decrease limit reached (${decreasesThisMonth}/3)`);
      return {
        shouldChangePrice: false,
        reasoning: `⚠️ NO SALES IN 7 DAYS: Zero recent sales detected, but already made ${decreasesThisMonth} price decreases this month (max 3 for safety). Will retry next month. Current: $${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin).`,
        confidence: 65
      };
    }

    // GRADUAL DISCOVERY: 10% → 15% → 20%
    let discountPercent = 0.10;
    if (decreasesThisMonth === 1) discountPercent = 0.15;
    if (decreasesThisMonth === 2) discountPercent = 0.20;

    const testPrice = currentPrice * (1 - discountPercent);
    const finalPrice = Math.max(testPrice, costPrice * 1.30); // Never below 30% margin
    const actualDecrease = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

    return {
      shouldChangePrice: true,
      recommendedPrice: finalPrice,
      reasoning: `📉 ZERO SALES IN 7 DAYS (Attempt ${decreasesThisMonth + 1}/3): No recent sales. Testing ${actualDecrease}% price reduction to $${finalPrice.toFixed(2)} to discover optimal price point. Maintains 30%+ margin. ${3 - decreasesThisMonth - 1} attempts remaining this month.`,
      urgency: 'HIGH',
      confidence: 75,
      priceChange: finalPrice - currentPrice,
      changePercent: (finalPrice - currentPrice) / currentPrice * 100,
      isDecrease: true
    };
  }

  // Mispricing B: Extremely high margin + slow demand
  if (currentMargin > MAX_MARGIN_PERCENT && salesVelocity < 0.5) {
    console.log(`   [ALGORITHM] 💸 MISPRICING: Very high margin (${currentMargin.toFixed(1)}%) + slow sales`);
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.max(targetPrice, currentPrice * (1 - MAX_DECREASE_PERCENT));
    const decreasePercent = ((currentPrice - cappedPrice) / currentPrice * 100).toFixed(1);

    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `💸 MARGIN TOO HIGH + SLOW SALES: Current margin ${currentMargin.toFixed(1)}% is above sustainable maximum of ${MAX_MARGIN_PERCENT}% and sales are slow (${salesVelocity.toFixed(2)} units/day). Lowering to $${cappedPrice.toFixed(2)} (-${decreasePercent}%) to achieve ${TARGET_MARGIN}% target margin and stimulate demand.`,
      urgency: 'MEDIUM',
      confidence: 85,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  // Mispricing C: Suspicious markup (pricing error detection)
  if (currentMarkup > SUSPICIOUS_MARKUP) {
    console.log(`   [ALGORITHM] ⚠️ MISPRICING: Suspicious markup (${currentMarkup.toFixed(1)}x)`);
    const reasonablePrice = costPrice * MAX_MARKUP_RATIO;
    const decreasePercent = ((currentPrice - reasonablePrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: reasonablePrice,
      reasoning: `⚠️ PRICING ERROR: Current markup of ${currentMarkup.toFixed(1)}x suggests possible mistake (price $${currentPrice.toFixed(2)} vs cost $${costPrice.toFixed(2)}). Recommending $${reasonablePrice.toFixed(2)} (-${decreasePercent}%), which is a ${MAX_MARKUP_RATIO}x markup - still profitable but more realistic.`,
      urgency: 'HIGH',
      confidence: 85,
      priceChange: reasonablePrice - currentPrice,
      changePercent: (reasonablePrice - currentPrice) / currentPrice * 100
    };
  }

  // ------------------------------------------
  // DECISION ORDER 3: OTHERWISE → NO CHANGE
  // ------------------------------------------

  console.log(`   [ALGORITHM] ✓ No safety issues, no obvious mispricing → DO NOTHING`);

  // Inventory can provide context notes, but NEVER initiates change
  let statusNote = '';
  if (inventory < 30 && salesVelocity > 1.0) {
    statusNote = ` Low stock (${inventory} units, ~${(inventory / salesVelocity).toFixed(0)} days at current velocity) - monitor for restocking.`;
  } else if (inventory > 90 && salesVelocity < 0.5) {
    statusNote = ` High inventory (${inventory} units) with slow sales - consider promotions or bundling.`;
  }

  return {
    shouldChangePrice: false,
    reasoning: `✅ PRICE IS APPROPRIATE: Current price $${currentPrice.toFixed(2)} with ${currentMargin.toFixed(1)}% margin is performing adequately. Sales: ${salesVelocity.toFixed(2)} units/day (${sales30d} in 30 days). No pricing changes needed at this time.${statusNote}`,
    confidence: 80 + (dataReliability === 'HIGH' ? 10 : 0)
  };
}

module.exports = analyzeProduct;
