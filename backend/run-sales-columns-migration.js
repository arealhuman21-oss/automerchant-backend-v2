require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🔧 Running database migration: Add sales tracking columns to products table\n');

  try {
    // Add total_sales_30d column
    console.log('📝 Adding total_sales_30d column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sales_30d INTEGER DEFAULT 0;'
    });

    // Note: Supabase free tier might not have exec_sql RPC, so we'll use a different approach
    // We'll run raw SQL using the pg library instead

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to database\n');

    // Add columns
    console.log('📝 Adding total_sales_30d column...');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sales_30d INTEGER DEFAULT 0;');
    console.log('✅ total_sales_30d added\n');

    console.log('📝 Adding revenue_30d column...');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS revenue_30d DECIMAL(10, 2) DEFAULT 0.00;');
    console.log('✅ revenue_30d added\n');

    console.log('📝 Adding sales_velocity column...');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_velocity DECIMAL(10, 3) DEFAULT 0.000;');
    console.log('✅ sales_velocity added\n');

    console.log('📝 Adding updated_at column...');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();');
    console.log('✅ updated_at added\n');

    // Create indexes
    console.log('📝 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_total_sales_30d ON products(total_sales_30d DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);');
    console.log('✅ Indexes created\n');

    // Verify columns exist
    console.log('🔍 Verifying columns...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'products'
      AND column_name IN ('total_sales_30d', 'revenue_30d', 'sales_velocity', 'updated_at')
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Migration complete! Columns added:');
    console.table(result.rows);

    // Check products count
    const countResult = await client.query('SELECT COUNT(*) as total_products FROM products;');
    console.log(`\n📊 Total products in database: ${countResult.rows[0].total_products}`);

    await client.end();

    console.log('\n🎉 SUCCESS! Database migration completed.');
    console.log('\n📋 Next Steps:');
    console.log('1. Log into your app at https://automerchant.vercel.app');
    console.log('2. Make sure Shopify is connected');
    console.log('3. Products should auto-sync (or refresh the page)');
    console.log('4. Set cost prices for your products');
    console.log('5. Run AI analysis');
    console.log('6. Check that "AI Profit Increase" shows a value > $0.00\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();
