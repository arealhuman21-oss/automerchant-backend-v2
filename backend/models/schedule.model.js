const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
}

async function upsert(scheduleData) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .upsert(scheduleData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateNextDue(userId, nextDueDate) {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .update({
      next_analysis_due: nextDueDate.toISOString(),
      last_analysis_run: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

async function findDueSchedules() {
  const { data, error } = await supabase
    .from('analysis_schedule')
    .select('user_id')
    .lte('next_analysis_due', new Date().toISOString());

  if (error) throw error;
  return data || [];
}

module.exports = {
  findByUserId,
  upsert,
  updateNextDue,
  findDueSchedules
};