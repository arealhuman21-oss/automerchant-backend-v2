/**
 * ADD ACCESS TOKEN TO EXISTING SHOP
 *
 * Use this when you need to add/update the Shopify access token
 * for a shop that's already in the database.
 *
 * Get the token from Shopify Partners:
 * 1. Go to Partners > Apps > Your Custom App
 * 2. Click "API credentials" tab
 * 3. Copy the "Admin API access token"
 *
 * Usage:
 *   node add-access-token.js <shop_domain> <access_token>
 *
 * Example:
 *   node add-access-token.js mystore.myshopify.com shpat_xxxxxxxxxxxxx
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addAccessToken() {
  const shopDomain = process.argv[2];
  const accessToken = process.argv[3];

  if (!shopDomain || !accessToken) {
    console.log('\n❌ Missing required parameters!\n');
    console.log('Usage:');
    console.log('  node add-access-token.js <shop_domain> <access_token>\n');
    console.log('Example:');
    console.log('  node add-access-token.js mystore.myshopify.com shpat_xxxxxxxxxxxxx\n');
    console.log('Get the token from Shopify Partners:');
    console.log('  1. Go to Partners > Apps > Your Custom App');
    console.log('  2. Click "API credentials"');
    console.log('  3. Copy "Admin API access token"\n');
    return;
  }

  // Format shop domain
  const formattedShop = shopDomain.includes('.myshopify.com')
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  // Validate token format
  if (!accessToken.startsWith('shpat_')) {
    console.log('\n⚠️  Warning: Token does not start with "shpat_"');
    console.log('   Shopify Admin API tokens usually start with "shpat_"\n');
  }

  console.log('\n🔑 ADDING ACCESS TOKEN');
  console.log('═'.repeat(50));
  console.log(`   Shop:  ${formattedShop}`);
  console.log(`   Token: ${accessToken.substring(0, 10)}...${accessToken.slice(-4)}`);
  console.log('═'.repeat(50) + '\n');

  // Check if shop exists
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, shop_domain, user_id, is_active')
    .eq('shop_domain', formattedShop)
    .single();

  if (shopError || !shop) {
    console.log('❌ Shop not found in database!');
    console.log('   Run onboard-custom-app.js first to create the shop record.\n');
    return;
  }

  console.log(`✅ Found shop (ID: ${shop.id})`);

  // Update the shop with the access token
  const { error: updateError } = await supabase
    .from('shops')
    .update({
      access_token: accessToken,
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', shop.id);

  if (updateError) {
    console.log(`❌ Failed to update: ${updateError.message}\n`);
    return;
  }

  console.log('✅ Access token saved!');
  console.log('✅ Shop is now ACTIVE\n');

  // Also update users table if linked
  if (shop.user_id) {
    await supabase
      .from('users')
      .update({ shopify_access_token: accessToken })
      .eq('id', shop.user_id);
    console.log(`✅ Updated user ${shop.user_id} with token\n`);
  }

  console.log('🎉 Done! The customer can now:');
  console.log('   - Sync products from Shopify');
  console.log('   - Run AI analysis');
  console.log('   - Apply price changes\n');
}

addAccessToken().catch(console.error);
