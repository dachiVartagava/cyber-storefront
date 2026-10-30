// Central Configuration (FE-003: Chosen Category Slug in one place)
export const APP_CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || 'https://shop-api-kbe6.onrender.com/api',
  DEFAULT_CATEGORY_SLUG: 'smartphones',
  PRODUCTS_PER_PAGE: 12,
  TOKEN_STORAGE_KEY: 'accessToken',
  LANG_STORAGE_KEY: 'cyber_lang',
} as const;
