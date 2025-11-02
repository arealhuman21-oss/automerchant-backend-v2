// migrate.js - Run this to add new columns to existing database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🔄 Starting database migration...\n');
  
  try {
    // Check existing tables
    console.log('🔍 Checking existing tables...');
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'products', 'recommendations', 'price_changes', 'analysis_schedule');
    `);
    
    const existingTables = tablesCheck.rows.map(row => row.table_name);
    console.log('📋 Existing tables:', existingTables.join(', ') || 'None');
    console.log('');

    // Create tables if they don't exist
    if (!existingTables.includes('users')) {
      console.log('📦 Creating users table...');
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          store_name VARCHAR(255) NOT NULL,
          shopify_shop VARCHAR(255),
          shopify_access_token TEXT,
          target_margin DECIMAL(5,2) DEFAULT 40.00,
          pricing_strategy VARCHAR(50) DEFAULT 'competitive',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Users table created');
    }

    if (!existingTables.includes('products')) {
      console.log('📦 Creating products table...');
      await pool.query(`
        CREATE TABLE products (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          shopify_product_id VARCHAR(255),
          shopify_variant_id VARCHAR(255),
          title VARCHAR(500) NOT NULL,
          sku VARCHAR(255),
          price DECIMAL(10,2) NOT NULL,
          cost_price DECIMAL(10,2) DEFAULT 0,
          inventory INTEGER DEFAULT 0,
          sales_velocity DECIMAL(10,2) DEFAULT 0,
          total_sales_30d INTEGER DEFAULT 0,
          total_sales_7d INTEGER DEFAULT 0,
          revenue_30d DECIMAL(10,2) DEFAULT 0,
          selected_for_analysis BOOLEAN DEFAULT false,
          last_analyzed_at TIMESTAMP,
          last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT products_user_variant_unique UNIQUE (user_id, shopify_variant_id)
        );
      `);
      console.log('✅ Products table created');
    }

    if (!existingTables.includes('recommendations')) {
      console.log('📦 Creating recommendations table...');
      await pool.query(`
        CREATE TABLE recommendations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          title VARCHAR(500),
          sku VARCHAR(255),
          current_price DECIMAL(10,2) NOT NULL,
          recommended_price DECIMAL(10,2) NOT NULL,
          action VARCHAR(50) NOT NULL,
          reasoning TEXT,
          confidence VARCHAR(50),
          expected_impact VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Recommendations table created');
    }

    if (!existingTables.includes('price_changes')) {
      console.log('📦 Creating price_changes table...');
      await pool.query(`
        CREATE TABLE price_changes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE SET NULL,
          old_price DECIMAL(10,2) NOT NULL,
          new_price DECIMAL(10,2) NOT NULL,
          profit_impact DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Price changes table created');
    }

    // NEW: Analysis schedule table
    if (!existingTables.includes('analysis_schedule')) {
      console.log('📦 Creating analysis_schedule table...');
      await pool.query(`
        CREATE TABLE analysis_schedule (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          last_analysis_run TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          next_analysis_due TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 minutes',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Analysis schedule table created');
    }

    console.log('');

    // Add missing columns to existing tables
    console.log('🔧 Adding missing columns to products table...');
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sales_velocity DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sales_30d INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sales_7d INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS revenue_30d DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS selected_for_analysis BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Products columns updated');

    console.log('🔧 Adding missing columns to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS target_margin DECIMAL(5,2) DEFAULT 40.00,
      ADD COLUMN IF NOT EXISTS pricing_strategy VARCHAR(50) DEFAULT 'competitive',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Users columns updated');

    console.log('🔧 Adding missing columns to recommendations table...');
    await pool.query(`
      ALTER TABLE recommendations 
      ADD COLUMN IF NOT EXISTS title VARCHAR(500),
      ADD COLUMN IF NOT EXISTS sku VARCHAR(255),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Recommendations columns updated');

    console.log('🔧 Adding missing columns to price_changes table...');
    await pool.query(`
      ALTER TABLE price_changes 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Price changes columns updated');

    // Add unique constraint if it doesn't exist
    console.log('🔒 Ensuring unique constraint exists...');
    try {
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT products_user_variant_unique 
        UNIQUE (user_id, shopify_variant_id);
      `);
      console.log('✅ Unique constraint added');
    } catch (err) {
      if (err.code === '42P07') {
        console.log('ℹ️  Unique constraint already exists');
      } else {
        throw err;
      }
    }

    // Create indexes for better performance
    console.log('🚀 Creating performance indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_selected ON products(selected_for_analysis);
      CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
      CREATE INDEX IF NOT EXISTS idx_price_changes_user_id ON price_changes(user_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_schedule_user_id ON analysis_schedule(user_id);
    `);
    console.log('✅ Indexes created');

    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('✅ All tables and columns are ready');
    console.log('✅ New features added:');
    console.log('   - Product selection for analysis');
    console.log('   - Analysis scheduling (every 30 minutes)');
    console.log('   - Countdown timer support');
    console.log('✅ You can now restart your backend server');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
