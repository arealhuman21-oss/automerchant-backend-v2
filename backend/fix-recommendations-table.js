// Fix Recommendations and Products Tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixTables() {
  console.log('🔧 Fixing database tables...\n');

  try {
    // Fix 1: Add missing columns to recommendations table
    console.log('1️⃣ Fixing recommendations table...');
    
    await pool.query(`
      ALTER TABLE recommendations 
      ADD COLUMN IF NOT EXISTS urgency VARCHAR(50);
    `);
    console.log('✅ urgency column added');

    await pool.query(`
      ALTER TABLE recommendations 
      ADD COLUMN IF NOT EXISTS confidence INTEGER;
    `);
    console.log('✅ confidence column added');

    await pool.query(`
      ALTER TABLE recommendations 
      ADD COLUMN IF NOT EXISTS reasoning TEXT;
    `);
    console.log('✅ reasoning column added');

    await pool.query(`
      ALTER TABLE recommendations 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('✅ created_at column added');

    // Fix 2: Add updated_at to products table
    console.log('\n2️⃣ Fixing products table...');
    
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('✅ updated_at column added');

    // Verify recommendations table
    console.log('\n3️⃣ Verifying recommendations table structure...');
    const recsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recommendations'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current recommendations table columns:');
    recsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Verify products table
    console.log('\n4️⃣ Verifying products table structure...');
    const productsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current products table columns:');
    productsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Database tables fixed successfully!');
    console.log('✅ Recommendations endpoint should work now');
    console.log('✅ Product sync should work now');
    
  } catch (error) {
    console.error('❌ Error fixing tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTables();
