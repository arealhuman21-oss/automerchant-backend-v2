const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugManualAnalysis() {
  console.log('🔍 MANUAL ANALYSIS DEBUG TOOL\n');
  console.log('Current time:', new Date().toISOString());
  console.log('24 hours ago:', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Get user ID 1 (ben)
  const userId = 1;

  // Get ALL manual analyses for this user
  const { data: allAnalyses, error: allError } = await supabase
    .from('manual_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching analyses:', allError);
    return;
  }

  console.log(`\n📊 Total manual analyses in database: ${allAnalyses.length}\n`);

  if (allAnalyses.length > 0) {
    console.log('ID | Triggered At | Hours Ago | Status');
    console.log('---|-------------|-----------|-------');

    const now = Date.now();
    allAnalyses.forEach(analysis => {
      const triggeredTime = new Date(analysis.triggered_at).getTime();
      const hoursAgo = ((now - triggeredTime) / (1000 * 60 * 60)).toFixed(1);
      const isWithin24h = hoursAgo < 24;
      const status = isWithin24h ? '🔴 COUNTS' : '✅ EXPIRED';

      console.log(`${analysis.id} | ${analysis.triggered_at} | ${hoursAgo}h ago | ${status}`);
    });
  }

  // Get count within last 24 hours (same logic as server)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count: within24h, error: countError } = await supabase
    .from('manual_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('triggered_at', twentyFourHoursAgo.toISOString());

  if (countError) {
    console.error('❌ Error counting:', countError);
    return;
  }

  console.log(`\n📈 Analyses within last 24 hours: ${within24h}/10`);
  console.log(`📈 Remaining today: ${Math.max(0, 10 - within24h)}/10`);

  if (within24h >= 10) {
    console.log('\n⚠️ DAILY LIMIT REACHED');
    console.log('Oldest analysis that counts will expire at:');

    const { data: oldest } = await supabase
      .from('manual_analyses')
      .select('*')
      .eq('user_id', userId)
      .gte('triggered_at', twentyFourHoursAgo.toISOString())
      .order('triggered_at', { ascending: true })
      .limit(1)
      .single();

    if (oldest) {
      const expiresAt = new Date(new Date(oldest.triggered_at).getTime() + 24 * 60 * 60 * 1000);
      const minutesUntilExpire = Math.ceil((expiresAt - now) / (1000 * 60));
      console.log(`  ${expiresAt.toISOString()} (in ${minutesUntilExpire} minutes)`);
    }
  }

  // Offer to clear old entries
  console.log('\n🛠️ OPTIONS:');
  console.log('1. To clear ALL analyses older than 24 hours:');
  console.log('   node backend/debug-manual-analysis.js --clean-old');
  console.log('2. To reset ALL analyses (EMERGENCY ONLY):');
  console.log('   node backend/debug-manual-analysis.js --reset-all');

  // Check command line args
  const args = process.argv.slice(2);

  if (args.includes('--clean-old')) {
    console.log('\n🧹 Cleaning old analyses...');
    const { data: deleted, error: deleteError } = await supabase
      .from('manual_analyses')
      .delete()
      .eq('user_id', userId)
      .lt('triggered_at', twentyFourHoursAgo.toISOString())
      .select();

    if (deleteError) {
      console.error('❌ Error deleting:', deleteError);
    } else {
      console.log(`✅ Deleted ${deleted?.length || 0} old analyses`);
    }
  }

  if (args.includes('--reset-all')) {
    console.log('\n🚨 RESETTING ALL ANALYSES (EMERGENCY)...');
    const { data: deleted, error: deleteError } = await supabase
      .from('manual_analyses')
      .delete()
      .eq('user_id', userId)
      .select();

    if (deleteError) {
      console.error('❌ Error deleting:', deleteError);
    } else {
      console.log(`✅ Deleted ${deleted?.length || 0} analyses`);
      console.log('✅ Daily limit reset to 0/10');
    }
  }
}

debugManualAnalysis().catch(console.error);
