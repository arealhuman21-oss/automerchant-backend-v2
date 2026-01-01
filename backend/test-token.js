// Test if Shopify access token works (read-only)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testToken() {
  try {
    // Get the beta user's shop data
    const { data, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('shop_domain', 'g0xuwm-8b.myshopify.com')
      .single();

    if (error || !data) {
      console.log('❌ Could not find shop in database:', error?.message);
      return;
    }

    console.log('📦 Found shop:', data.shop_domain);
    console.log('🔑 Token preview:', data.access_token?.substring(0, 10) + '...');

    // Test the token with a read-only API call
    const response = await axios.get(
      `https://${data.shop_domain}/admin/api/2024-01/shop.json`,
      { headers: { 'X-Shopify-Access-Token': data.access_token } }
    );

    console.log('\n✅ TOKEN WORKS!');
    console.log('Store name:', response.data.shop.name);
    console.log('Store email:', response.data.shop.email);
    console.log('Store domain:', response.data.shop.domain);
    console.log('Currency:', response.data.shop.currency);

  } catch (err) {
    if (err.response) {
      console.log('❌ API Error:', err.response.status, err.response.data);
    } else {
      console.log('❌ Error:', err.message);
    }
  }
}

testToken();
