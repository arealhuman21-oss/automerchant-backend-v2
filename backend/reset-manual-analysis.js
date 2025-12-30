require('dotenv').config();
const { supabaseService } = require('./config/database');

async function resetManualAnalysis() {
  try {
    const { data, error } = await supabaseService
      .from('manual_analyses')
      .delete()
      .eq('user_id', 7);

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Reset manual analysis count for user 7');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetManualAnalysis();
