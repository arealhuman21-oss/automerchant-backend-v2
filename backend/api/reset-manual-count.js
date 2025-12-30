// Temporary endpoint to reset manual analysis count
// DELETE THIS FILE AFTER DEBUGGING
const { supabaseService } = require('../config/database');

module.exports = async (req, res) => {
  try {
    // Hardcoded for user 7 (benjamincao98@gmail.com) - TEMP DEBUG ONLY
    const userId = 7;

    const { data, error } = await supabaseService
      .from('manual_analyses')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Reset error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Also log current count
    const { data: count } = await supabaseService
      .from('manual_analyses')
      .select('id')
      .eq('user_id', userId);

    res.json({
      success: true,
      message: `Reset manual analysis count for user ${userId}`,
      remaining: count?.length || 0
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
};
