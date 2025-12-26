require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function onboardCustomer() {
  // Get parameters from command line
  const userEmail = process.argv[2];
  const shopName = process.argv[3]; // Just the shop name without .myshopify.com

  if (!userEmail || !shopName) {
    console.log('\n❌ Missing required parameters!\n');
    console.log('Usage:');
    console.log('  node onboard-customer.js USER_EMAIL SHOP_NAME\n');
    console.log('Example:');
    console.log('  node onboard-customer.js benjamincao98@gmail.com automerchanttest\n');
    return;
  }

  // Verify user exists and get their assigned app
  console.log(`\n🔍 Looking up user: ${userEmail}...\n`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();

  if (userError || !user) {
    console.log('❌ User not found in database!');
    console.log('The user must sign up first at: https://automerchant.vercel.app\n');
    return;
  }

  console.log('✅ User found!');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Approved: ${user.approved ? '✅' : '❌ NOT APPROVED'}`);
  console.log(`   Assigned App ID: ${user.assigned_app_id || '❌ NONE'}\n`);

  if (!user.approved) {
    console.log('❌ User is not approved yet!');
    console.log('Approve the user in the admin panel first.\n');
    return;
  }

  if (!user.assigned_app_id) {
    console.log('❌ User has no assigned app!');
    console.log('Assign an app to the user in the admin panel first.\n');
    return;
  }

  // Get app details
  const { data: app, error: appError } = await supabase
    .from('shopify_apps')
    .select('*')
    .eq('id', user.assigned_app_id)
    .single();

  if (appError || !app) {
    console.log(`❌ App ID ${user.assigned_app_id} not found!`);
    return;
  }

  console.log('✅ App details:');
  console.log(`   App Name: ${app.app_name}`);
  console.log(`   Client ID: ${app.client_id}`);
  console.log(`   Status: ${app.status}\n`);

  // Format shop domain
  const shopDomain = shopName.includes('.myshopify.com')
    ? shopName
    : `${shopName}.myshopify.com`;

  console.log('═══════════════════════════════════════════════════════');
  console.log('        📋 CUSTOMER ONBOARDING INSTRUCTIONS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Customer: ' + userEmail);
  console.log('Shop: ' + shopDomain);
  console.log('App: ' + app.app_name + ' (ID: ' + user.assigned_app_id + ')\n');

  console.log('─────────────────────────────────────────');
  console.log('STEP 1: Generate Shopify Install Link');
  console.log('─────────────────────────────────────────\n');

  console.log('⚠️  IMPORTANT: Custom Distribution requires Shopify-signed links!\n');
  console.log('1. Go to: https://partners.shopify.com/');
  console.log('2. Click "Apps" → Find your app:');
  console.log(`   Client ID: ${app.client_id}`);
  console.log('3. Click "Test your app" or "Distribution" tab');
  console.log(`4. Enter store name: ${shopName.replace('.myshopify.com', '')}`);
  console.log('5. Click "Generate install link"\n');

  console.log('Expected link format:');
  console.log(`https://admin.shopify.com/store/${shopName.replace('.myshopify.com', '')}/oauth/install_custom_app?client_id=${app.client_id}&signature=XXXXXXX\n`);

  console.log('─────────────────────────────────────────');
  console.log('STEP 2: Send Link to Customer');
  console.log('─────────────────────────────────────────\n');

  console.log('Copy this email template:\n');
  console.log('───────────────── EMAIL START ─────────────────');
  console.log(`Subject: AutoMerchant - Your Installation Link\n`);
  console.log(`Hi there,\n`);
  console.log(`Great news! Your AutoMerchant account is ready.\n`);
  console.log(`Click this link to install AutoMerchant on your Shopify store:\n`);
  console.log(`[PASTE SHOPIFY-GENERATED LINK HERE]\n`);
  console.log(`After clicking:`);
  console.log(`1. You'll see a Shopify authorization page`);
  console.log(`2. Click "Install app"`);
  console.log(`3. Installation will complete!\n`);
  console.log(`Then login at: https://automerchant.vercel.app`);
  console.log(`Use your Google account: ${userEmail}\n`);
  console.log(`Questions? Just reply to this email.\n`);
  console.log(`Best,`);
  console.log(`AutoMerchant Team`);
  console.log('───────────────── EMAIL END ─────────────────\n');

  console.log('─────────────────────────────────────────');
  console.log('STEP 3: After Customer Installs App');
  console.log('─────────────────────────────────────────\n');

  console.log('Once the customer completes the OAuth installation,');
  console.log('run this command to link the shop to their account:\n');
  console.log(`node backend/auto-link-shop.js ${shopDomain} ${userEmail}\n`);

  console.log('OR run this SQL in Supabase:\n');
  console.log('─────── COPY THIS SQL ───────');
  console.log(`UPDATE shops`);
  console.log(`SET user_id = ${user.id}`);
  console.log(`WHERE shop_domain = '${shopDomain}';\n`);

  console.log(`-- Verify it worked:`);
  console.log(`SELECT s.shop_domain, s.user_id, u.email`);
  console.log(`FROM shops s`);
  console.log(`LEFT JOIN users u ON s.user_id = u.id`);
  console.log(`WHERE s.shop_domain = '${shopDomain}';`);
  console.log('─────────────────────────────\n');

  console.log('─────────────────────────────────────────');
  console.log('STEP 4: Verify Everything Works');
  console.log('─────────────────────────────────────────\n');

  console.log('After linking, verify with:\n');
  console.log(`node backend/verify-shop-user-link.js ${shopDomain} ${userEmail}\n`);

  console.log('Expected output: "✅ SUCCESS! Shop is correctly linked to user!"\n');

  console.log('─────────────────────────────────────────');
  console.log('STEP 5: Customer Login Test');
  console.log('─────────────────────────────────────────\n');

  console.log('Have customer:');
  console.log('1. Go to: https://automerchant.vercel.app');
  console.log(`2. Login with Google: ${userEmail}`);
  console.log('3. Should see Product Dashboard (not waitlist!)');
  console.log('4. Products should sync from Shopify\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('                  📋 QUICK REFERENCE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Shopify Partners: https://partners.shopify.com/');
  console.log('Supabase SQL: https://supabase.com/dashboard/project/mfuqxntaivvqiajfgjtv/sql/new');
  console.log('Frontend: https://automerchant.vercel.app');
  console.log(`Backend Logs: https://vercel.com/automerchantais-projects/automerchant-backend-v2/logs\n`);

  console.log('Link shop command:');
  console.log(`node backend/auto-link-shop.js ${shopDomain} ${userEmail}\n`);

  console.log('Verify link command:');
  console.log(`node backend/verify-shop-user-link.js ${shopDomain} ${userEmail}\n`);

  console.log('═══════════════════════════════════════════════════════\n');
}

onboardCustomer().catch(console.error);
