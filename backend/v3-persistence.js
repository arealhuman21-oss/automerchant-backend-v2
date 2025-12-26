// ============================================
// V3 PERSISTENCE LAYER
// Handles loading and saving V3 state (regret budgets, elasticity learners)
// ============================================

const { RegretBudget, ElasticityLearner } = require('./analyzeProduct-v3');

/**
 * Load regret budgets for all products from database
 */
async function loadRegretBudgets(supabase, userId) {
  const { data, error } = await supabase
    .from('regret_budgets')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading regret budgets:', error);
    return {};
  }

  const budgets = {};

  for (const row of data || []) {
    const budget = new RegretBudget(row.product_id, row.initial_budget);
    budget.currentBudget = parseFloat(row.current_budget);
    budget.cumulativeRegret = parseFloat(row.cumulative_regret);
    budgets[row.product_id] = budget;
  }

  return budgets;
}

/**
 * Save regret budget to database
 */
async function saveRegretBudget(supabase, userId, productId, budget, shopId = null) {
  const { error } = await supabase
    .from('regret_budgets')
    .upsert({
      product_id: productId,
      user_id: userId,
      shop_id: shopId,
      initial_budget: budget.initialBudget,
      current_budget: budget.currentBudget,
      cumulative_regret: budget.cumulativeRegret,
      is_frozen: budget.isFrozen(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'product_id,user_id'
    });

  if (error) {
    console.error('Error saving regret budget:', error);
  }
}

/**
 * Load elasticity learners for all products from database
 */
async function loadElasticityLearners(supabase, userId) {
  const { data, error } = await supabase
    .from('elasticity_learners')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading elasticity learners:', error);
    return {};
  }

  const learners = {};

  for (const row of data || []) {
    const learner = new ElasticityLearner(row.product_id);
    learner.mu = parseFloat(row.mu);
    learner.sigma = parseFloat(row.sigma);
    learner.observations = []; // Don't load full history (not needed)
    learner.lastUpdate = row.last_observation_at ? new Date(row.last_observation_at).getTime() : null;
    learners[row.product_id] = learner;
  }

  return learners;
}

/**
 * Save elasticity learner to database
 */
async function saveElasticityLearner(supabase, userId, productId, learner, shopId = null) {
  const posterior = learner.getPosterior();

  const { error } = await supabase
    .from('elasticity_learners')
    .upsert({
      product_id: productId,
      user_id: userId,
      shop_id: shopId,
      mu: learner.mu,
      sigma: learner.sigma,
      observation_count: posterior.observations,
      confidence: posterior.confidence,
      last_observation_at: learner.lastUpdate ? new Date(learner.lastUpdate).toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'product_id,user_id'
    });

  if (error) {
    console.error('Error saving elasticity learner:', error);
  }
}

/**
 * Load price change observations for a product
 */
async function loadPriceChangeObservations(supabase, userId, productId, limit = 10) {
  const { data, error } = await supabase
    .from('price_change_observations')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('is_valid', true)
    .order('observation_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading price change observations:', error);
    return [];
  }

  return (data || []).map(row => ({
    timestamp: row.observation_start,
    priceBefore: parseFloat(row.price_before),
    priceAfter: parseFloat(row.price_after),
    demandBefore: parseFloat(row.demand_before),
    demandAfter: parseFloat(row.demand_after),
    daysElapsed: parseInt(row.days_elapsed)
  }));
}

/**
 * Save price change observation to database
 */
async function savePriceChangeObservation(supabase, userId, productId, observation, shopId = null) {
  // Calculate fields
  const changePercent = ((observation.priceAfter - observation.priceBefore) / observation.priceBefore) * 100;

  const logPriceRatio = Math.log(observation.priceAfter / observation.priceBefore);
  const logDemandRatio = Math.log((observation.demandAfter + 0.1) / (observation.demandBefore + 0.1));
  const observedElasticity = logDemandRatio / logPriceRatio;

  // Validate
  let isValid = true;
  let rejectionReason = null;

  if (Math.abs(changePercent) < 2) {
    isValid = false;
    rejectionReason = 'Price change too small (< 2%)';
  } else if (observation.daysElapsed < 7) {
    isValid = false;
    rejectionReason = 'Observation period too short (< 7 days)';
  } else if (observedElasticity > 0 || observedElasticity < -10) {
    isValid = false;
    rejectionReason = 'Elasticity outlier (wrong sign or absurd value)';
  }

  const { error } = await supabase
    .from('price_change_observations')
    .insert({
      product_id: productId,
      user_id: userId,
      shop_id: shopId,
      price_before: observation.priceBefore,
      price_after: observation.priceAfter,
      change_percent: changePercent,
      demand_before: observation.demandBefore,
      demand_after: observation.demandAfter,
      observation_start: observation.timestamp,
      observation_end: new Date(new Date(observation.timestamp).getTime() + observation.daysElapsed * 24 * 60 * 60 * 1000).toISOString(),
      days_elapsed: observation.daysElapsed,
      observed_elasticity: observedElasticity,
      weight: 1.0,
      is_valid: isValid,
      rejection_reason: rejectionReason
    });

  if (error) {
    console.error('Error saving price change observation:', error);
  }
}

/**
 * Save V3 recommendation metadata
 */
async function saveV3Metadata(supabase, recommendationId, v3Metadata) {
  if (!v3Metadata || !v3Metadata.explanation) return;

  const explanation = v3Metadata.explanation;

  const { error } = await supabase
    .from('v3_recommendations_metadata')
    .insert({
      recommendation_id: recommendationId,
      evi: v3Metadata.eviMetrics?.evi || null,
      signal_strength: v3Metadata.eviMetrics?.signalStrength || null,
      uncertainty_reduction: v3Metadata.eviMetrics?.reductionInUncertainty || null,
      future_value: v3Metadata.eviMetrics?.futureValue || null,
      dos: explanation?.constraints?.dosConstraint?.current || null,
      dos_regime: v3Metadata.dosRegime || null,
      stockout_risk: explanation?.constraints?.dosConstraint?.stockoutRisk || null,
      deadstock_risk: explanation?.constraints?.dosConstraint?.deadstockRisk || null,
      pareto_frontier_size: v3Metadata.paretoFrontierSize || null,
      total_candidates_evaluated: v3Metadata.totalCandidates || null,
      regret_budget_remaining: explanation?.constraints?.regretBudget?.remaining || null,
      regret_budget_frozen: explanation?.constraints?.regretBudget?.frozen || false,
      elasticity_mean: explanation?.uncertainty?.elasticity?.mean || null,
      elasticity_sigma: explanation?.uncertainty?.elasticity?.sigma || null,
      elasticity_observations: explanation?.uncertainty?.elasticity?.observations || 0,
      structured_explanation: explanation
    });

  if (error) {
    console.error('Error saving V3 metadata:', error);
  }
}

/**
 * Batch save all V3 state after analysis run
 */
async function saveV3State(supabase, userId, shopId, regretBudgets, elasticityLearners) {
  // Save all regret budgets
  for (const [productId, budget] of Object.entries(regretBudgets)) {
    await saveRegretBudget(supabase, userId, parseInt(productId), budget, shopId);
  }

  // Save all elasticity learners
  for (const [productId, learner] of Object.entries(elasticityLearners)) {
    await saveElasticityLearner(supabase, userId, parseInt(productId), learner, shopId);
  }

  console.log(`   💾 Saved V3 state: ${Object.keys(regretBudgets).length} budgets, ${Object.keys(elasticityLearners).length} learners`);
}

module.exports = {
  loadRegretBudgets,
  saveRegretBudget,
  loadElasticityLearners,
  saveElasticityLearner,
  loadPriceChangeObservations,
  savePriceChangeObservation,
  saveV3Metadata,
  saveV3State
};
