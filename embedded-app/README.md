# AutoMerchant Embedded App - Redirect Shell

This is a minimal Shopify embedded app that redirects merchants to the main AutoMerchant dashboard at `https://automerchant.ai`.

## Purpose

When merchants install the AutoMerchant app from the Shopify App Store, they are redirected through this embedded app which:

1. Detects if running in a Shopify iframe
2. Extracts the shop parameter
3. Redirects to the main SaaS dashboard at `https://automerchant.ai?shop={shop}`

## Deployment

Deploy this as a static site to Vercel, Netlify, or any static hosting service.

### Vercel Deployment

```bash
cd embedded-app
vercel --prod
```

Set this URL as your "App URL" in the Shopify Partner Dashboard:
- **App URL**: `https://embedded.automerchant.ai` (or your Vercel URL)

## Shopify Partner Dashboard Configuration

- **App URL**: `https://embedded.automerchant.ai`
- **Allowed redirection URLs**: 
  - `https://automerchant.ai`
  - `https://automerchant.ai/dashboard`
  - `https://automerchant.ai/auth`

## Testing

Open `public/index.html` in a browser with:
```
file:///path/to/public/index.html?shop=example-store.myshopify.com
```

You should be redirected to `https://automerchant.ai?shop=example-store.myshopify.com`
