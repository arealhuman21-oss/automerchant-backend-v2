const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function findById(recommendationId) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', recommendationId)
    .single();

  if (error) throw error;
  return data;
}

async function create(recommendationData) {
  const { data, error } = await supabase
    .from('recommendations')
    .insert(recommendationData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsert(recommendationData) {
  const { data, error } = await supabase
    .from('recommendations')
    .upsert(recommendationData, { onConflict: 'user_id,product_id' });

  if (error) throw error;
  return data;
}

async function deleteById(recommendationId) {
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', recommendationId);

  if (error) throw error;
}

module.exports = {
  findByUserId,
  findById,
  create,
  upsert,
  deleteById
};