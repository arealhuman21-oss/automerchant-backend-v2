

// Add Manual Analysis Tracking
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addManualAnalysisTracking() {
  console.log('🔧 Adding manual analysis tracking...\n');

  try {
    // Create table to track manual analyses
    console.log('1️⃣ Creating manual_analyses table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manual_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        triggered_at TIMESTAMP DEFAULT NOW(),
        products_analyzed INTEGER DEFAULT 0
      );
    `);
    console.log('✅ manual_analyses table created\n');

    // Create index for faster queries
    console.log('2️⃣ Creating index...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_manual_analyses_user_date 
      ON manual_analyses(user_id, triggered_at);
    `);
    console.log('✅ Index created\n');

    console.log('🎉 Manual analysis tracking ready!');
    console.log('✅ Users can now run 10 manual analyses per day');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addManualAnalysisTracking();