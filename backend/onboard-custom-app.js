/**
 * COMPLETE ONBOARDING SCRIPT FOR CUSTOM DISTRIBUTION APPS
 *
 * For custom distribution apps, OAuth may not provide the access token.
 * Instead, you get the Admin API access token from Shopify Partners:
 *
 * 1. Go to Shopify Partners > Apps > Your Custom App
 * 2. Click "API credentials" tab
 * 3. Copy the "Admin API access token" (shown once when created)
 *
 * Then run this script to set everything up.
 *
 * Usage:
 *   node onboard-custom-app.js <shop_domain> <user_email> <access_token>
 *
 * Example:
 *   node onboard-custom-app.js mystore.myshopify.com customer@email.com shpat_xxxxx
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function onboardCustomApp() {
  const shopDomain = process.argv[2];
  const userEmail = process.argv[3];
  const accessToken = process.argv[4];

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 CUSTOM DISTRIBUTION APP - COMPLETE ONBOARDING');
  console.log('═'.repeat(60) + '\n');

  // Validate inputs
  if (!shopDomain || !userEmail) {
    console.log('❌ Missing required parameters!\n');
    console.log('Usage:');
    console.log('  node onboard-custom-app.js <shop_domain> <user_email> [access_token]\n');
    console.log('Examples:');
    console.log('  node onboard-custom-app.js mystore.myshopify.com customer@email.com');
    console.log('  node onboard-custom-app.js mystore.myshopify.com customer@email.com shpat_xxxxx\n');
    console.log('Note: If access_token is not provided, you can add it later.\n');
    return;
  }

  // Format shop domain
  const formattedShop = shopDomain.includes('.myshopify.com')
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  console.log(`📋 ONBOARDING DETAILS:`);
  console.log(`   Shop: ${formattedShop}`);
  console.log(`   User: ${userEmail}`);
  console.log(`   Token: ${accessToken ? '✅ Provided' : '⚠️  Not provided (will add later)'}\n`);

  // ============================================
  // STEP 1: Find or create user
  // ============================================
  console.log('1️⃣  CHECKING USER...');

  let { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, approved')
    .eq('email', userEmail.toLowerCase())
    .single();

  if (userError || !user) {
    console.log(`   User not found. Creating new user...`);

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: userEmail.toLowerCase(),
        approved: true,  // Auto-approve for custom distribution
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.log(`   ❌ Failed to create user: ${createError.message}`);
      return;
    }

    user = newUser;
    console.log(`   ✅ Created new user (ID: ${user.id})`);
  } else {
    console.log(`   ✅ Found existing user (ID: ${user.id})`);
  }

  // Ensure user is approved
  if (!user.approved) {
    console.log(`   Approving user...`);
    await supabase
      .from('users')
      .update({ approved: true })
      .eq('id', user.id);
    console.log(`   ✅ User approved`);
  } else {
    console.log(`   ✅ User already approved`);
  }

  // ============================================
  // STEP 2: Find or create shop record
  // ============================================
  console.log('\n2️⃣  CHECKING SHOP...');

  let { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, shop_domain, access_token, user_id, is_active')
    .eq('shop_domain', formattedShop)
    .single();

  if (shopError || !shop) {
    console.log(`   Shop not found. Creating new shop record...`);

    const { data: newShop, error: createShopError } = await supabase
      .from('shops')
      .insert({
        shop_domain: formattedShop,
        access_token: accessToken || null,
        user_id: user.id,
        is_active: !!accessToken,  // Only active if token provided
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createShopError) {
      console.log(`   ❌ Failed to create shop: ${createShopError.message}`);
      return;
    }

    shop = newShop;
    console.log(`   ✅ Created new shop record (ID: ${shop.id})`);
  } else {
    console.log(`   ✅ Found existing shop (ID: ${shop.id})`);

    // Update shop with new info
    const updates = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (accessToken) {
      updates.access_token = accessToken;
      updates.is_active = true;
    }

    await supabase
      .from('shops')
      .update(updates)
      .eq('id', shop.id);

    console.log(`   ✅ Updated shop record`);
  }

  // Show token status
  const hasToken = accessToken || shop.access_token;
  if (hasToken) {
    console.log(`   ✅ Access token: SET`);
  } else {
    console.log(`   ⚠️  Access token: MISSING - add it later with update script`);
  }

  // ============================================
  // STEP 3: Update user's shopify_shop field
  // ============================================
  console.log('\n3️⃣  LINKING USER TO SHOP...');

  const { error: linkError } = await supabase
    .from('users')
    .update({
      shopify_shop: formattedShop,
      shopify_access_token: accessToken || null
    })
    .eq('id', user.id);

  if (linkError) {
    console.log(`   ❌ Failed to link: ${linkError.message}`);
  } else {
    console.log(`   ✅ User linked to shop`);
  }

  // ============================================
  // STEP 4: Initialize analysis schedule
  // ============================================
  console.log('\n4️⃣  INITIALIZING ANALYSIS SCHEDULE...');

  const nextAnalysisDue = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  const { error: scheduleError } = await supabase
    .from('analysis_schedule')
    .upsert({
      user_id: user.id,
      next_analysis_due: nextAnalysisDue.toISOString(),
      last_analysis_run: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (scheduleError) {
    console.log(`   ⚠️  Could not create schedule: ${scheduleError.message}`);
  } else {
    console.log(`   ✅ Analysis schedule initialized (next run in 30 min)`);
  }

  // ============================================
  // STEP 5: Log activity (if table exists)
  // ============================================
  try {
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        action: 'onboarding_complete',
        details: {
          shop_domain: formattedShop,
          method: 'custom_distribution',
          has_token: !!hasToken
        },
        created_at: new Date().toISOString()
      });
  } catch (e) {
    // Table might not exist yet - that's ok
  }

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ ONBOARDING COMPLETE!');
  console.log('═'.repeat(60) + '\n');

  console.log('📊 SUMMARY:');
  console.log(`   User ID:     ${user.id}`);
  console.log(`   Email:       ${userEmail}`);
  console.log(`   Shop:        ${formattedShop}`);
  console.log(`   Approved:    ✅ Yes`);
  console.log(`   Token:       ${hasToken ? '✅ Set' : '⚠️  Missing'}`);
  console.log(`   Active:      ${hasToken ? '✅ Yes' : '❌ No (needs token)'}`);

  if (!hasToken) {
    console.log('\n⚠️  IMPORTANT: Access token not set!');
    console.log('   To add the token later, run:');
    console.log(`   node add-access-token.js ${formattedShop} shpat_YOUR_TOKEN_HERE\n`);
    console.log('   Get the token from Shopify Partners:');
    console.log('   1. Go to Partners > Apps > Your App');
    console.log('   2. Click "API credentials"');
    console.log('   3. Copy "Admin API access token"\n');
  }

  console.log('\n🎉 CUSTOMER CAN NOW:');
  console.log('   1. Go to https://automerchant.vercel.app');
  console.log('   2. Sign in with Google using: ' + userEmail);
  console.log('   3. Access their Product Dashboard');
  if (hasToken) {
    console.log('   4. Sync products from Shopify');
    console.log('   5. Run AI analysis and get recommendations\n');
  } else {
    console.log('   ⚠️  (Products won\'t sync until token is added)\n');
  }
}

onboardCustomApp().catch(console.error);
