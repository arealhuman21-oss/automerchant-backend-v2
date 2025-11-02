// Fix Users Table - Add missing password column
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixUsersTable() {
  console.log('🔧 Fixing users table...\n');

  try {
    // Check current users table structure
    console.log('1️⃣ Checking current users table structure...');
    const currentColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current columns:');
    currentColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Add password column if missing
    console.log('2️⃣ Adding password column...');
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      `);
      console.log('✅ password column added\n');
    } catch (err) {
      console.log('⚠️  password column might already exist\n');
    }

    // Add other potentially missing columns
    console.log('3️⃣ Adding other missing columns...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    `);
    console.log('✅ name column verified');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
    `);
    console.log('✅ email column verified');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shopify_shop VARCHAR(255);
    `);
    console.log('✅ shopify_shop column verified');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
    `);
    console.log('✅ shopify_access_token column verified');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('✅ created_at column verified\n');

    // Verify final structure
    console.log('4️⃣ Verifying final users table structure...');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Final users table columns:');
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Users table fixed successfully!');
    console.log('✅ You can now register and login!');
    
  } catch (error) {
    console.error('❌ Error fixing users table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixUsersTable();
