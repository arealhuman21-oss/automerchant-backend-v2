require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixShopOwnership() {
  console.log('\nFIXING SHOP OWNERSHIP');
  console.log('=' .repeat(50));

  const shopDomain = 'automerchanttest.myshopify.com';
  const targetEmail = 'benjamincao98@gmail.com';

  try {
    // Get target user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', targetEmail)
      .single();

    if (userError || !user) {
      throw new Error('User not found: ' + targetEmail);
    }

    console.log('Found user:', user.email, '(ID:', user.id + ')');

    // Get current shop ownership
    const { data: currentShop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_domain, user_id, app_id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !currentShop) {
      throw new Error('Shop not found: ' + shopDomain);
    }

    // Get current owner email
    const { data: currentOwner } = await supabase
      .from('users')
      .select('email')
      .eq('id', currentShop.user_id)
      .single();

    console.log('\nCURRENT STATE:');
    console.log('  Shop:', currentShop.shop_domain);
    console.log('  Current Owner:', currentOwner?.email || 'Unknown', '(User ID:', currentShop.user_id + ')');
    console.log('  App ID:', currentShop.app_id);

    if (currentShop.user_id === user.id) {
      console.log('\nShop is already owned by the correct user!');
      console.log('No changes needed.');
      return;
    }

    console.log('\nUPDATING OWNERSHIP...');
    console.log('  From:', currentOwner?.email || 'Unknown', '(ID:', currentShop.user_id + ')');
    console.log('  To:', user.email, '(ID:', user.id + ')');

    // Update shop ownership
    const { error: updateError } = await supabase
      .from('shops')
      .update({ user_id: user.id })
      .eq('shop_domain', shopDomain);

    if (updateError) {
      throw updateError;
    }

    console.log('\nSUCCESS! Shop ownership updated!');

    // Verify the update
    const { data: verifyShop } = await supabase
      .from('shops')
      .select('shop_domain, user_id')
      .eq('shop_domain', shopDomain)
      .single();

    const { data: verifyUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', verifyShop.user_id)
      .single();

    console.log('\nVERIFIED:');
    console.log('  Shop:', verifyShop.shop_domain);
    console.log('  New Owner:', verifyUser.email, '(User ID:', verifyShop.user_id + ')');

    console.log('\nWHAT THIS MEANS:');
    console.log('  ', targetEmail, 'can now:');
    console.log('    - View orders from', shopDomain);
    console.log('    - Sync products');
    console.log('    - Run AI analysis');
    console.log('    - Apply pricing recommendations');

    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('Failed to fix shop ownership:', error.message);
    process.exit(1);
  }
}

fixShopOwnership()
  .then(() => {
    console.log('Fix complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fix failed:', err);
    process.exit(1);
  });
