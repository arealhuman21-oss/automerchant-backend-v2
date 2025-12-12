require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkShopConnections() {
  console.log('\n🔍 ============================================');
  console.log('   CHECKING SHOP CONNECTIONS');
  console.log('============================================\n');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, shopify_shop, shopify_access_token, approved')
      .order('id');

    if (usersError) throw usersError;

    console.log('👥 USERS IN DATABASE:');
    console.log('═'.repeat(80));
    users.forEach(user => {
      console.log(`ID: ${user.id} | Email: ${user.email}`);
      console.log(`   Approved: ${user.approved ? '✅' : '❌'}`);
      console.log(`   Shopify Shop (users table): ${user.shopify_shop || '❌ None'}`);
      console.log(`   Access Token: ${user.shopify_access_token ? '✅ Set' : '❌ None'}`);
      console.log('');
    });

    // Get all shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, shop_domain, user_id, app_id, is_active, installed_at')
      .order('id');

    if (shopsError) throw shopsError;

    console.log('\n🏪 SHOPS IN DATABASE:');
    console.log('═'.repeat(80));

    if (shops.length === 0) {
      console.log('⚠️  No shops found in shops table');
    } else {
      shops.forEach(shop => {
        const linkedUser = users.find(u => u.id === shop.user_id);
        console.log(`Shop: ${shop.shop_domain}`);
        console.log(`   Shop ID: ${shop.id}`);
        console.log(`   User ID: ${shop.user_id || '❌ NULL'}`);
        console.log(`   User Email: ${linkedUser ? linkedUser.email : '❌ No user linked'}`);
        console.log(`   App ID: ${shop.app_id || '❌ NULL'}`);
        console.log(`   Active: ${shop.is_active ? '✅' : '❌'}`);
        console.log(`   Installed: ${shop.installed_at || 'N/A'}`);
        console.log('');
      });
    }

    // Check for duplicate shop connections
    console.log('\n⚠️  CHECKING FOR DUPLICATES:');
    console.log('═'.repeat(80));

    const shopDomains = shops.map(s => s.shop_domain);
    const duplicates = shopDomains.filter((domain, index) => shopDomains.indexOf(domain) !== index);

    if (duplicates.length > 0) {
      console.log('🚨 DUPLICATE SHOPS FOUND:');
      duplicates.forEach(domain => {
        const duplicateShops = shops.filter(s => s.shop_domain === domain);
        console.log(`\n   Shop Domain: ${domain}`);
        duplicateShops.forEach((shop, idx) => {
          const linkedUser = users.find(u => u.id === shop.user_id);
          console.log(`   Connection #${idx + 1}:`);
          console.log(`      Shop ID: ${shop.id}`);
          console.log(`      User: ${linkedUser ? linkedUser.email : 'No user'}`);
          console.log(`      App ID: ${shop.app_id || 'None'}`);
          console.log(`      Active: ${shop.is_active ? 'Yes' : 'No'}`);
        });
      });
    } else {
      console.log('✅ No duplicate shop connections found');
    }

    // Check for emails mentioned by user
    console.log('\n🎯 CHECKING SPECIFIC EMAILS:');
    console.log('═'.repeat(80));

    const waitlistUser = users.find(u => u.email.includes('waitlist'));
    const benUser = users.find(u => u.email === 'benjamincao98@gmail.com');

    if (waitlistUser) {
      console.log(`📧 Waitlist Email: ${waitlistUser.email}`);
      console.log(`   User ID: ${waitlistUser.id}`);
      console.log(`   Shop in users table: ${waitlistUser.shopify_shop || 'None'}`);

      const waitlistShops = shops.filter(s => s.user_id === waitlistUser.id);
      console.log(`   Shops in shops table: ${waitlistShops.length}`);
      waitlistShops.forEach(shop => {
        console.log(`      - ${shop.shop_domain} (Active: ${shop.is_active})`);
      });
    } else {
      console.log('❌ No waitlist email found');
    }

    console.log('');

    if (benUser) {
      console.log(`📧 Ben's Email: ${benUser.email}`);
      console.log(`   User ID: ${benUser.id}`);
      console.log(`   Shop in users table: ${benUser.shopify_shop || 'None'}`);

      const benShops = shops.filter(s => s.user_id === benUser.id);
      console.log(`   Shops in shops table: ${benShops.length}`);
      benShops.forEach(shop => {
        console.log(`      - ${shop.shop_domain} (Active: ${shop.is_active})`);
      });
    } else {
      console.log('❌ benjamincao98@gmail.com not found');
    }

    // Check if same shop is connected to both
    if (waitlistUser && benUser) {
      const waitlistShopDomains = shops.filter(s => s.user_id === waitlistUser.id).map(s => s.shop_domain);
      const benShopDomains = shops.filter(s => s.user_id === benUser.id).map(s => s.shop_domain);

      const sharedShops = waitlistShopDomains.filter(domain => benShopDomains.includes(domain));

      if (sharedShops.length > 0) {
        console.log('\n🚨 PROBLEM FOUND: Same shop connected to BOTH emails!');
        console.log('═'.repeat(80));
        sharedShops.forEach(domain => {
          console.log(`   Shop: ${domain}`);
          console.log(`   This is causing the orders to only show for one user!`);
        });
      } else {
        console.log('\n✅ No shared shops between these two emails');
      }
    }

    console.log('\n============================================\n');

  } catch (error) {
    console.error('❌ Failed to check shop connections:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the check
checkShopConnections()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Check failed:', err);
    process.exit(1);
  });
