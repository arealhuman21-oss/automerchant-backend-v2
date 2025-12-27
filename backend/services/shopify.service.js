const axios = require('axios');
const { supabase } = require('../config/database');

/**
 * Fetch all products from Shopify
 */
async function fetchShopifyProducts(shop, accessToken) {
  let allProducts = [];
  let url = `https://${shop}/admin/api/2024-01/products.json?limit=250`;

  while (url) {
    const response = await axios.get(url, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const pageProducts = response.data.products || [];
    allProducts = allProducts.concat(pageProducts);

    // Pagination
    const linkHeader = response.headers['link'];
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    } else {
      url = null;
    }
  }

  return allProducts;
}

/**
 * Fetch orders from Shopify with pagination
 */
async function fetchShopifyOrders(shop, accessToken, daysBack = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  let allOrders = [];
  let url = `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${startDate.toISOString()}&limit=250`;
  let pageCount = 0;

  while (url) {
    pageCount++;
    const response = await axios.get(url, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const pageOrders = response.data.orders || [];
    allOrders = allOrders.concat(pageOrders);

    // Pagination
    const linkHeader = response.headers['link'];
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    } else {
      url = null;
    }

    if (pageCount > 100) break; // Safety limit
  }

  return allOrders;
}

/**
 * Update product price on Shopify
 */
async function updateProductPrice(shop, accessToken, variantId, newPrice) {
  const url = `https://${shop}/admin/api/2024-01/variants/${variantId}.json`;

  const response = await axios.put(
    url,
    { variant: { id: variantId, price: newPrice.toFixed(2) } },
    { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
  );

  return response.data;
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeOAuthCode(shop, code, clientId, clientSecret, redirectUri) {
  const response = await axios.post(
    `https://${shop}/admin/oauth/access_token`,
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  return response.data;
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyOrders,
  updateProductPrice,
  exchangeOAuthCode
};
