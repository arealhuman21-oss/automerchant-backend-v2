const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/database');

// GET /api/analysis/status - Get timer + limits
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Get user's last analysis and manual analysis count
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_analysis, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Calculate daily manual analysis limit (3 per day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    const { count: manualCount, error: countError } = await supabase
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayISO);

    if (countError) {
      console.error('Error counting manual analyses:', countError);
      return res.status(500).json({ error: 'Failed to count analyses' });
    }

    // Get next analysis due time from schedule
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('analysis_schedule')
      .select('next_analysis_due')
      .eq('user_id', userId)
      .single();

    const nextAnalysisDue = scheduleData?.next_analysis_due || null;

    // Calculate time until next analysis (30 minutes minimum)
    let timeUntilNext = 0;
    if (nextAnalysisDue) {
      const nextTime = new Date(nextAnalysisDue).getTime();
      const currentTime = new Date().getTime();
      timeUntilNext = Math.max(0, nextTime - currentTime);
    }

    // Check if user can run analysis now
    const canRunNow = timeUntilNext === 0 && manualCount < 3;

    res.json({
      canRunNow,
      timeUntilNextMs: timeUntilNext,
      timeUntilNextMinutes: Math.ceil(timeUntilNext / 60000),
      manualAnalysesToday: manualCount,
      dailyLimit: 3,
      lastAnalysis: userData?.last_analysis || null,
      nextAnalysisDue,
      userCreatedAt: userData?.created_at || null
    });

  } catch (error) {
    console.error('Analysis status error:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
});

// POST /api/analyze - Run manual analysis
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Check manual analysis limit (3 per day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    const { count: manualCount, error: countError } = await supabase
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayISO);

    if (countError) {
      console.error('Error counting manual analyses:', countError);
      return res.status(500).json({ error: 'Failed to count analyses' });
    }

    if (manualCount >= 3) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        message: 'Maximum 3 manual analyses per day reached. Try again tomorrow.'
      });
    }

    // Check cooldown period (30 minutes between analyses)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_analysis')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (userData?.last_analysis) {
      const lastAnalysisTime = new Date(userData.last_analysis).getTime();
      const currentTime = new Date().getTime();
      const timeSinceLast = currentTime - lastAnalysisTime;
      const cooldownMs = 30 * 60 * 1000; // 30 minutes

      if (timeSinceLast < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLast) / 60000);
        return res.status(429).json({
          error: 'Cooldown period',
          message: `Please wait ${remainingMinutes} minutes before running another analysis`
        });
      }
    }

    // Record manual analysis attempt
    const { error: recordError } = await supabase
      .from('manual_analyses')
      .insert({
        user_id: userId,
        created_at: now
      });

    if (recordError) {
      console.error('Error recording manual analysis:', recordError);
    }

    // Update user's last analysis time
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_analysis: now })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating last analysis time:', updateError);
    }

    // Trigger analysis (this would typically be done in a background job)
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: 'Analysis started successfully',
      manualAnalysesToday: manualCount + 1,
      dailyLimit: 3
    });

  } catch (error) {
    console.error('Manual analysis error:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

module.exports = router;
