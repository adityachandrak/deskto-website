/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_TITLE?: string;
  readonly VITE_SITE_DESCRIPTION?: string;
  readonly VITE_SITE_PHONE?: string;
  readonly VITE_SITE_EMAIL?: string;
  readonly VITE_SITE_ADDRESS?: string;
  readonly VITE_SOCIAL_INSTAGRAM?: string;
  readonly VITE_SOCIAL_YOUTUBE?: string;
  readonly VITE_SOCIAL_FACEBOOK?: string;
  readonly VITE_SOCIAL_TWITTER?: string;
  readonly VITE_BUSINESS_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
