require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateDatabase() {
  try {
    console.log('🔄 Updating database schema...');
    
    await pool.query(`
      ALTER TABLE price_changes 
      ADD COLUMN IF NOT EXISTS profit_per_unit_difference DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sales_velocity_at_change DECIMAL(10,3) DEFAULT 0;
    `);
    
    console.log('✅ Database updated successfully!');
    console.log('✅ Added columns: profit_per_unit_difference, sales_velocity_at_change');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
  }
}

updateDatabase();