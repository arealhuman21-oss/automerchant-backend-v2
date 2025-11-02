// Reset Manual Analyses Count
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetManualAnalyses() {
  console.log('🔄 Resetting manual analyses...\n');

  try {
    // Delete all manual analyses records
    const result = await pool.query('DELETE FROM manual_analyses');
    
    console.log(`✅ Deleted ${result.rowCount} manual analysis records`);
    console.log('✅ All users now have 10/10 manual analyses available\n');
    
    console.log('🎉 Reset complete!');
    console.log('💡 Restart your server for the change to take effect');
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (error.code === '42P01') {
      console.log('\n⚠️  Table does not exist yet. Run add-manual-analysis-tracking.js first!');
    }
  } finally {
    await pool.end();
  }
}

resetManualAnalyses();
