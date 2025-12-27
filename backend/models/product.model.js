const { supabase } = require('../config/database');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function findById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

async function create(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function update(productId, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCostPrice(productId, costPrice) {
  return update(productId, { cost_price: costPrice });
}

async function toggleSelection(productId, selected) {
  return update(productId, { selected_for_analysis: selected });
}

async function bulkUpsert(products) {
  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'shopify_product_id,user_id' });

  if (error) throw error;
  return data;
}

module.exports = {
  findByUserId,
  findById,
  create,
  update,
  updateCostPrice,
  toggleSelection,
  bulkUpsert
};