require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAllManualAnalyses() {
  console.log('\n🔄 ============================================');
  console.log('   RESETTING MANUAL ANALYSIS COUNTERS');
  console.log('============================================\n');

  try {
    // Delete all manual_analyses records
    const { data, error, count } = await supabase
      .from('manual_analyses')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️  Table "manual_analyses" does not exist yet.');
        console.log('   This is normal if you haven\'t run any manual analyses yet.');
        console.log('   The table will be created automatically on first use.');
        return;
      }
      throw error;
    }

    console.log('✅ Successfully reset manual analysis counters for ALL users!');
    console.log(`   Deleted all manual_analyses records`);
    console.log('\n📊 Result:');
    console.log('   All users now have 10/10 manual analyses available');
    console.log('   Counter uses 24-hour rolling window (older analyses expire automatically)');
    console.log('\n============================================\n');

  } catch (error) {
    console.error('❌ Failed to reset manual analyses:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the reset
resetAllManualAnalyses()
  .then(() => {
    console.log('✅ Reset complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  });
