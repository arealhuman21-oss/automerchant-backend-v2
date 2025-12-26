// Run V3 database migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://mfuqxntaivvqiajfgjtv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXF4bnRhaXZ2cWlhamZnanR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxNjk4NywiZXhwIjoyMDc3NTkyOTg3fQ.OiPFxNhHZARTwRMtGc6HyIfagftdNjMPGmBt_QmSWGk'
);

async function runMigration() {
  console.log('🗄️  Reading migration file...');
  const sql = fs.readFileSync('./migrations/004_add_v3_tables.sql', 'utf8');

  console.log('📊 Running V3 migration...');

  // Split into individual statements and run them
  const statements = sql.split(';').filter(s => s.trim().length > 0);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    console.log(`   Executing statement ${i + 1}/${statements.length}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct SQL execution via PostgreSQL connection
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: 'postgresql://postgres.mfuqxntaivvqiajfgjtv:Aatiaday2018!@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
        });

        await pool.query(statement);
        console.log(`   ✅ Statement ${i + 1} executed`);
        await pool.end();
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`   ⚠️  Statement ${i + 1} skipped (already exists)`);
      } else {
        console.error(`   ❌ Error in statement ${i + 1}:`, err.message);
      }
    }
  }

  console.log('\n✅ Migration complete! Verifying tables...');

  // Verify tables exist
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: 'postgresql://postgres.mfuqxntaivvqiajfgjtv:Aatiaday2018!@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
  });

  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'regret_budgets',
        'elasticity_learners',
        'price_change_observations',
        'regret_decision_history',
        'v3_recommendations_metadata'
      )
    ORDER BY table_name;
  `);

  console.log('\n📋 V3 Tables:');
  result.rows.forEach(row => {
    console.log(`   ✅ ${row.table_name}`);
  });

  if (result.rows.length === 5) {
    console.log('\n🎉 All 5 V3 tables created successfully!');
  } else {
    console.log(`\n⚠️  Only ${result.rows.length}/5 tables found`);
  }

  await pool.end();
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
