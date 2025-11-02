// Complete Database Inspection and Fix
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function inspectAndFix() {
  console.log('🔍 COMPLETE DATABASE INSPECTION AND FIX\n');

  try {
    // Check if users table exists
    console.log('1️⃣ Checking if users table exists...');
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Users table does not exist! Creating it...\n');
      
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          shopify_shop VARCHAR(255),
          shopify_access_token TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('✅ Users table created!\n');
    } else {
      console.log('✅ Users table exists\n');
      
      // Show current structure
      console.log('2️⃣ Current users table structure:');
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('');
      
      // Add missing columns
      console.log('3️⃣ Adding any missing columns...');
      
      const columnsToAdd = [
        { name: 'password', type: 'VARCHAR(255)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'name', type: 'VARCHAR(255)', nullable: true },
        { name: 'shopify_shop', type: 'VARCHAR(255)', nullable: true },
        { name: 'shopify_access_token', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: true, default: 'NOW()' }
      ];
      
      for (const col of columnsToAdd) {
        try {
          if (col.default) {
            await pool.query(`
              ALTER TABLE users 
              ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};
            `);
          } else {
            await pool.query(`
              ALTER TABLE users 
              ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
            `);
          }
          console.log(`   ✅ ${col.name} verified`);
        } catch (err) {
          console.log(`   ⚠️  ${col.name}: ${err.message}`);
        }
      }
      console.log('');
    }
    
    // Final verification
    console.log('4️⃣ Final users table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // Check for any existing users
    console.log('5️⃣ Checking existing users...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   📊 Total users in database: ${userCount.rows[0].count}\n`);
    
    // Check other required tables
    console.log('6️⃣ Checking other required tables...');
    const tables = ['products', 'recommendations', 'price_changes', 'analysis_schedule'];
    
    for (const table of tables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (exists.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ❌ ${table} table MISSING!`);
      }
    }
    
    console.log('\n🎉 Database inspection complete!');
    console.log('✅ Try logging in or registering now!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

inspectAndFix();
