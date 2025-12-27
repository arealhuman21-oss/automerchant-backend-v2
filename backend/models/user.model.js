const { supabase } = require('../config/database');

/**
 * Find user by email
 */
async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find user by ID
 */
async function findById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create new user
 */
async function create(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user
 */
async function update(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve user
 */
async function approve(userId) {
  return update(userId, { approved: true });
}

module.exports = {
  findByEmail,
  findById,
  create,
  update,
  approve
};