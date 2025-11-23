-- Migration: ensure shopify_apps can store Shopify-provided install links

ALTER TABLE shopify_apps
ADD COLUMN IF NOT EXISTS install_url TEXT;

COMMENT ON COLUMN shopify_apps.install_url IS 'Shopify-provided installation URL for this partner app';

-- Backfill legacy rows with the previous auto-generated format so admins do not lose links
UPDATE shopify_apps
SET install_url = COALESCE(
  install_url,
  CASE
    WHEN shop_domain IS NOT NULL THEN
      'https://automerchant.vercel.app/api/shopify/install?shop=' || shop_domain || '&app_id=' || id
    ELSE NULL
  END
)
WHERE install_url IS NULL;
