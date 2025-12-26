-- ============================================
-- V3 ALGORITHM PERSISTENCE TABLES
-- ============================================

-- Table: regret_budgets
-- Tracks cumulative regret per product to prevent spiraling losses
CREATE TABLE IF NOT EXISTS regret_budgets (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  shop_id INTEGER,

  -- Budget tracking
  initial_budget DECIMAL(10, 2) DEFAULT 100.00,
  current_budget DECIMAL(10, 2) DEFAULT 100.00,
  cumulative_regret DECIMAL(10, 2) DEFAULT 0.00,

  -- Status
  is_frozen BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one budget per product per user
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_regret_budgets_product ON regret_budgets(product_id);
CREATE INDEX idx_regret_budgets_user ON regret_budgets(user_id);
CREATE INDEX idx_regret_budgets_frozen ON regret_budgets(is_frozen);

-- Table: elasticity_learners
-- Bayesian posterior distribution over price elasticity per product
CREATE TABLE IF NOT EXISTS elasticity_learners (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  shop_id INTEGER,

  -- Posterior distribution parameters
  mu DECIMAL(10, 4) DEFAULT -1.2000,  -- Mean elasticity
  sigma DECIMAL(10, 4) DEFAULT 0.9000, -- Standard deviation

  -- Learning statistics
  observation_count INTEGER DEFAULT 0,
  confidence DECIMAL(5, 4) DEFAULT 0.0000, -- 1 - (sigma / prior_sigma)

  -- Timestamps
  last_observation_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one learner per product per user
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_elasticity_learners_product ON elasticity_learners(product_id);
CREATE INDEX idx_elasticity_learners_user ON elasticity_learners(user_id);

-- Table: price_change_observations
-- Historical price changes and their outcomes for elasticity learning
CREATE TABLE IF NOT EXISTS price_change_observations (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  shop_id INTEGER,

  -- Price change
  price_before DECIMAL(10, 2) NOT NULL,
  price_after DECIMAL(10, 2) NOT NULL,
  change_percent DECIMAL(10, 4),

  -- Demand response
  demand_before DECIMAL(10, 4) NOT NULL, -- units per day
  demand_after DECIMAL(10, 4) NOT NULL,  -- units per day

  -- Observation window
  observation_start TIMESTAMP NOT NULL,
  observation_end TIMESTAMP NOT NULL,
  days_elapsed INTEGER,

  -- Calculated elasticity
  observed_elasticity DECIMAL(10, 4),
  weight DECIMAL(5, 4) DEFAULT 1.0000, -- Decay weight

  -- Quality flags
  is_valid BOOLEAN DEFAULT TRUE,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Link to elasticity learner
  elasticity_learner_id INTEGER REFERENCES elasticity_learners(id) ON DELETE CASCADE
);

CREATE INDEX idx_price_observations_product ON price_change_observations(product_id);
CREATE INDEX idx_price_observations_user ON price_change_observations(user_id);
CREATE INDEX idx_price_observations_valid ON price_change_observations(is_valid);
CREATE INDEX idx_price_observations_date ON price_change_observations(observation_start);

-- Table: regret_decision_history
-- Detailed history of pricing decisions for regret accounting
CREATE TABLE IF NOT EXISTS regret_decision_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  regret_budget_id INTEGER REFERENCES regret_budgets(id) ON DELETE CASCADE,

  -- Decision
  price_chosen DECIMAL(10, 2) NOT NULL,
  alternative_prices JSONB, -- Array of alternatives considered

  -- Outcome
  realized_profit DECIMAL(10, 2),
  counterfactual_profit DECIMAL(10, 2), -- Best alternative
  regret DECIMAL(10, 2), -- max(0, counterfactual - realized)

  -- Budget impact
  budget_before DECIMAL(10, 2),
  budget_after DECIMAL(10, 2),

  -- Timestamps
  decision_timestamp TIMESTAMP DEFAULT NOW(),
  outcome_timestamp TIMESTAMP, -- When outcome was measured

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regret_history_product ON regret_decision_history(product_id);
CREATE INDEX idx_regret_history_budget ON regret_decision_history(regret_budget_id);
CREATE INDEX idx_regret_history_date ON regret_decision_history(decision_timestamp);

-- Table: v3_recommendations_metadata
-- Extended metadata for V3 recommendations (links to recommendations table)
CREATE TABLE IF NOT EXISTS v3_recommendations_metadata (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE CASCADE,

  -- EVI metrics
  evi DECIMAL(10, 4),
  signal_strength DECIMAL(5, 4),
  uncertainty_reduction DECIMAL(5, 4),
  future_value DECIMAL(10, 2),

  -- DOS metrics
  dos DECIMAL(10, 2),
  dos_regime VARCHAR(20), -- TIGHT, NORMAL, EXCESS, CLEARANCE
  stockout_risk DECIMAL(5, 4),
  deadstock_risk DECIMAL(5, 4),

  -- Pareto frontier
  pareto_frontier_size INTEGER,
  total_candidates_evaluated INTEGER,

  -- Regret budget status
  regret_budget_remaining DECIMAL(10, 2),
  regret_budget_frozen BOOLEAN,

  -- Elasticity posterior
  elasticity_mean DECIMAL(10, 4),
  elasticity_sigma DECIMAL(10, 4),
  elasticity_observations INTEGER,

  -- Structured explanation (JSON)
  structured_explanation JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_v3_metadata_recommendation ON v3_recommendations_metadata(recommendation_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update regret budget
CREATE OR REPLACE FUNCTION update_regret_budget(
  p_product_id INTEGER,
  p_user_id INTEGER,
  p_regret DECIMAL(10, 2),
  p_gain DECIMAL(10, 2) DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_current_budget DECIMAL(10, 2);
  v_initial_budget DECIMAL(10, 2);
  v_new_budget DECIMAL(10, 2);
BEGIN
  -- Get current budget
  SELECT current_budget, initial_budget
  INTO v_current_budget, v_initial_budget
  FROM regret_budgets
  WHERE product_id = p_product_id AND user_id = p_user_id;

  -- Calculate new budget
  v_new_budget := v_current_budget - p_regret + (p_gain * 0.5);

  -- Clamp to [0, initial_budget]
  v_new_budget := GREATEST(0, LEAST(v_new_budget, v_initial_budget));

  -- Update
  UPDATE regret_budgets
  SET
    current_budget = v_new_budget,
    cumulative_regret = cumulative_regret + p_regret,
    is_frozen = (v_new_budget <= 0),
    updated_at = NOW()
  WHERE product_id = p_product_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize regret budget if not exists
CREATE OR REPLACE FUNCTION ensure_regret_budget(
  p_product_id INTEGER,
  p_user_id INTEGER,
  p_shop_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_budget_id INTEGER;
BEGIN
  INSERT INTO regret_budgets (product_id, user_id, shop_id)
  VALUES (p_product_id, p_user_id, p_shop_id)
  ON CONFLICT (product_id, user_id) DO NOTHING
  RETURNING id INTO v_budget_id;

  IF v_budget_id IS NULL THEN
    SELECT id INTO v_budget_id
    FROM regret_budgets
    WHERE product_id = p_product_id AND user_id = p_user_id;
  END IF;

  RETURN v_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize elasticity learner if not exists
CREATE OR REPLACE FUNCTION ensure_elasticity_learner(
  p_product_id INTEGER,
  p_user_id INTEGER,
  p_shop_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_learner_id INTEGER;
BEGIN
  INSERT INTO elasticity_learners (product_id, user_id, shop_id)
  VALUES (p_product_id, p_user_id, p_shop_id)
  ON CONFLICT (product_id, user_id) DO NOTHING
  RETURNING id INTO v_learner_id;

  IF v_learner_id IS NULL THEN
    SELECT id INTO v_learner_id
    FROM elasticity_learners
    WHERE product_id = p_product_id AND user_id = p_user_id;
  END IF;

  RETURN v_learner_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS (adjust based on your user setup)
-- ============================================

-- Grant permissions to authenticated users
-- GRANT ALL ON regret_budgets TO authenticated;
-- GRANT ALL ON elasticity_learners TO authenticated;
-- GRANT ALL ON price_change_observations TO authenticated;
-- GRANT ALL ON regret_decision_history TO authenticated;
-- GRANT ALL ON v3_recommendations_metadata TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE regret_budgets IS 'V3: Tracks cumulative regret per product to prevent spiraling losses';
COMMENT ON TABLE elasticity_learners IS 'V3: Bayesian posterior distribution over price elasticity per product';
COMMENT ON TABLE price_change_observations IS 'V3: Historical price changes and demand responses for learning';
COMMENT ON TABLE regret_decision_history IS 'V3: Detailed history of pricing decisions and outcomes';
COMMENT ON TABLE v3_recommendations_metadata IS 'V3: Extended metadata for recommendations';

COMMENT ON COLUMN regret_budgets.current_budget IS 'Remaining budget for risky pricing moves (dollars)';
COMMENT ON COLUMN regret_budgets.cumulative_regret IS 'Total regret accumulated over all decisions';
COMMENT ON COLUMN regret_budgets.is_frozen IS 'TRUE when budget exhausted and pricing is frozen';

COMMENT ON COLUMN elasticity_learners.mu IS 'Posterior mean of price elasticity (typically negative)';
COMMENT ON COLUMN elasticity_learners.sigma IS 'Posterior standard deviation (uncertainty)';
COMMENT ON COLUMN elasticity_learners.confidence IS 'Learning confidence: 1 - (sigma / prior_sigma)';

COMMENT ON COLUMN price_change_observations.observed_elasticity IS 'Calculated as Δlog(quantity) / Δlog(price)';
COMMENT ON COLUMN price_change_observations.weight IS 'Exponential decay weight for old observations';
