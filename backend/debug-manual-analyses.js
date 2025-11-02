// Debug and Reset Manual Analyses
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugManualAnalyses() {
  console.log('🔍 Debugging manual analyses...\n');

  try {
    // Check if table exists
    console.log('1️⃣ Checking if manual_analyses table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'manual_analyses'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table does not exist! Creating it now...\n');
      
      await pool.query(`
        CREATE TABLE manual_analyses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          triggered_at TIMESTAMP DEFAULT NOW(),
          products_analyzed INTEGER DEFAULT 0
        );
      `);
      
      await pool.query(`
        CREATE INDEX idx_manual_analyses_user_date 
        ON manual_analyses(user_id, triggered_at);
      `);
      
      console.log('✅ Table created!\n');
    } else {
      console.log('✅ Table exists\n');
    }

    // Get all users
    console.log('2️⃣ Checking manual analyses for all users...');
    const users = await pool.query('SELECT id, email FROM users');
    
    if (users.rows.length === 0) {
      console.log('⚠️  No users found\n');
      return;
    }

    console.log(`Found ${users.rows.length} users:\n`);

    for (const user of users.rows) {
      // Today's start
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Count today's analyses
      const todayCount = await pool.query(
        'SELECT COUNT(*) as count FROM manual_analyses WHERE user_id = $1 AND triggered_at >= $2',
        [user.id, todayStart]
      );
      
      // Count all time
      const allTimeCount = await pool.query(
        'SELECT COUNT(*) as count FROM manual_analyses WHERE user_id = $1',
        [user.id]
      );
      
      console.log(`👤 User: ${user.email} (ID: ${user.id})`);
      console.log(`   📊 Today's analyses: ${todayCount.rows[0].count}`);
      console.log(`   📊 All-time analyses: ${allTimeCount.rows[0].count}`);
      console.log(`   ✅ Remaining today: ${10 - parseInt(todayCount.rows[0].count)}\n`);
    }

    // Show all manual analyses records
    console.log('3️⃣ All manual analyses records:');
    const allRecords = await pool.query(`
      SELECT ma.*, u.email 
      FROM manual_analyses ma
      JOIN users u ON ma.user_id = u.id
      ORDER BY ma.triggered_at DESC
      LIMIT 50
    `);
    
    if (allRecords.rows.length === 0) {
      console.log('   📭 No records yet\n');
    } else {
      allRecords.rows.forEach(record => {
        const date = new Date(record.triggered_at);
        console.log(`   - ${record.email}: ${date.toLocaleString()} (${record.products_analyzed} products)`);
      });
      console.log('');
    }

    // Ask if user wants to reset
    console.log('4️⃣ To reset manual analyses for a user, run this query:');
    console.log('   DELETE FROM manual_analyses WHERE user_id = YOUR_USER_ID;');
    console.log('\n   Or to reset everyone:');
    console.log('   DELETE FROM manual_analyses;');
    console.log('');
    
    console.log('🎉 Debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugManualAnalyses();
