const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  console.log('🔍 Checking benjamincao98@gmail.com...\n');

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'benjamincao98@gmail.com')
    .single();

  if (userError || !user) {
    console.log('❌ User not found:', userError);
    return;
  }

  console.log('✅ USER FOUND:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Approved: ${user.approved}`);
  console.log(`   Shopify Shop: ${user.shopify_shop || 'NULL'}`);

  // Get shops for this user
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('*')
    .eq('user_id', user.id);

  console.log(`\n📦 SHOPS LINKED TO THIS USER: ${shops?.length || 0}`);

  if (shops && shops.length > 0) {
    shops.forEach(shop => {
      console.log(`\n   Shop Domain: ${shop.shop_domain}`);
      console.log(`   User ID: ${shop.user_id}`);
      console.log(`   Active: ${shop.is_active}`);
      console.log(`   Has Token: ${shop.access_token ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   App ID: ${shop.app_id || 'NULL'}`);
    });
  } else {
    console.log('   ❌ NO SHOPS FOUND FOR THIS USER!');

    // Check if there are orphaned shops
    const { data: allShops } = await supabase
      .from('shops')
      .select('shop_domain, user_id, is_active');

    console.log(`\n   📋 ALL SHOPS IN DATABASE: ${allShops?.length || 0}`);
    allShops?.forEach(s => {
      console.log(`      ${s.shop_domain} - user_id: ${s.user_id || 'NULL'} - active: ${s.is_active}`);
    });
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
