require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function autoLinkShop() {
  // Get parameters from command line
  const shopDomain = process.argv[2];
  const userEmail = process.argv[3];

  if (!shopDomain || !userEmail) {
    console.log('\n❌ Missing required parameters!\n');
    console.log('Usage:');
    console.log('  node auto-link-shop.js SHOP_DOMAIN USER_EMAIL\n');
    console.log('Example:');
    console.log('  node auto-link-shop.js automerchanttest.myshopify.com benjamincao98@gmail.com\n');
    return;
  }

  // Format shop domain if needed
  const formattedShop = shopDomain.includes('.myshopify.com')
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  console.log('\n🔗 AUTO-LINKING SHOP TO USER');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Look up user
  console.log(`1️⃣  Looking up user: ${userEmail}...`);
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, approved, assigned_app_id')
    .eq('email', userEmail)
    .single();

  if (userError || !user) {
    console.log('❌ User not found!');
    console.log('The user must exist in the database first.\n');
    return;
  }

  console.log(`✅ User found!`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Approved: ${user.approved ? '✅' : '❌'}\n`);

  // Step 2: Look up shop
  console.log(`2️⃣  Looking up shop: ${formattedShop}...`);
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('shop_domain', formattedShop)
    .single();

  if (shopError || !shop) {
    console.log('❌ Shop not found!');
    console.log('The shop must be installed via OAuth first.\n');
    console.log('📝 Next steps:');
    console.log('1. Get Shopify Partners signed install link');
    console.log('2. Install the app on the shop');
    console.log('3. Then run this script again\n');
    return;
  }

  console.log(`✅ Shop found!`);
  console.log(`   Domain: ${shop.shop_domain}`);
  console.log(`   Current User ID: ${shop.user_id || '❌ NULL (Not linked)'}`);
  console.log(`   App ID: ${shop.app_id}`);
  console.log(`   Access Token: ${shop.access_token ? '✅ Set' : '❌ Missing'}\n`);

  // Step 3: Check if already linked
  if (shop.user_id === user.id) {
    console.log('✅ Shop is already linked to this user!');
    console.log('No action needed.\n');
    return;
  }

  if (shop.user_id) {
    // Get current owner details
    const { data: currentOwner } = await supabase
      .from('users')
      .select('email')
      .eq('id', shop.user_id)
      .single();

    console.log('🚨 WARNING: SHOP ALREADY CONNECTED!');
    console.log('═'.repeat(55));
    console.log(`\n📊 CURRENT STATE:`);
    console.log(`   Shop: ${formattedShop}`);
    console.log(`   Current Owner: ${currentOwner?.email || 'Unknown'} (User ID: ${shop.user_id})`);
    console.log(`\n🔄 PROPOSED CHANGE:`);
    console.log(`   New Owner: ${userEmail} (User ID: ${user.id})`);
    console.log(`\n⚠️  WHAT WILL HAPPEN IF YOU CONTINUE:`);
    console.log(`   ❌ ${currentOwner?.email || 'Current user'} will LOSE access to:`);
    console.log(`      - Orders from ${formattedShop}`);
    console.log(`      - Product data`);
    console.log(`      - AI recommendations`);
    console.log(`   ✅ ${userEmail} will GAIN access to:`);
    console.log(`      - All orders from ${formattedShop}`);
    console.log(`      - All products`);
    console.log(`      - AI pricing features`);
    console.log(`\n🛡️  SAFETY CHECK:`);
    console.log(`   Are you SURE you want to transfer ownership?`);
    console.log(`   This action will disconnect the shop from the current user.`);
    console.log('\n═'.repeat(55));

    if (!process.argv.includes('--force')) {
      console.log('\n❌ STOPPED: Add --force flag to confirm this action\n');
      console.log('To proceed, run:');
      console.log(`   node auto-link-shop.js ${shopDomain} ${userEmail} --force\n`);
      return;
    }

    console.log('\n⚠️  --force flag detected. Proceeding with ownership transfer...\n');
  }

  // Step 4: Update the shop
  console.log(`3️⃣  Linking shop to user...`);
  const { error: updateError } = await supabase
    .from('shops')
    .update({ user_id: user.id })
    .eq('shop_domain', formattedShop);

  if (updateError) {
    console.log('❌ Failed to link shop!');
    console.log('Error:', updateError.message, '\n');
    return;
  }

  console.log('✅ Successfully linked shop to user!\n');

  // Step 5: Verify the update
  console.log(`4️⃣  Verifying...`);
  const { data: verifyShop } = await supabase
    .from('shops')
    .select('shop_domain, user_id, app_id')
    .eq('shop_domain', formattedShop)
    .single();

  if (verifyShop && verifyShop.user_id === user.id) {
    console.log('✅ VERIFICATION PASSED!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('           🎉 SHOP SUCCESSFULLY LINKED!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Shop:  ${formattedShop}`);
    console.log(`User:  ${userEmail} (ID: ${user.id})`);
    console.log(`App:   ID ${verifyShop.app_id}\n`);
    console.log('✅ Customer can now:');
    console.log('   1. Login to https://automerchant.vercel.app');
    console.log('   2. Use Google OAuth with: ' + userEmail);
    console.log('   3. See their Product Dashboard');
    console.log('   4. View AI recommendations');
    console.log('   5. Apply price changes\n');
  } else {
    console.log('❌ Verification failed!');
    console.log('Something went wrong. Check the database manually.\n');
  }
}

autoLinkShop().catch(console.error);
