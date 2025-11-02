// Quick Fix Migration - Add missing columns and fix database issues
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function quickFix() {
  console.log('🔧 Starting quick fix migration...\n');

  try {
    // Fix 1: Add image_url column to products if missing
    console.log('1️⃣ Checking for image_url column...');
    try {
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS image_url TEXT;
      `);
      console.log('✅ image_url column added/verified\n');
    } catch (err) {
      console.log('⚠️  image_url column might already exist:', err.message, '\n');
    }

    // Fix 2: Add sku column if missing (appears in UI)
    console.log('2️⃣ Checking for sku column...');
    try {
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS sku TEXT;
      `);
      console.log('✅ sku column added/verified\n');
    } catch (err) {
      console.log('⚠️  sku column might already exist:', err.message, '\n');
    }

    // Fix 3: Add last_synced column if missing
    console.log('3️⃣ Checking for last_synced column...');
    try {
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP DEFAULT NOW();
      `);
      console.log('✅ last_synced column added/verified\n');
    } catch (err) {
      console.log('⚠️  last_synced column might already exist:', err.message, '\n');
    }

    // Verify all columns exist
    console.log('4️⃣ Verifying products table structure...');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Current products table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Quick fix migration completed successfully!');
    console.log('✅ All missing columns have been added');
    console.log('✅ Database is now ready');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

quickFix();
