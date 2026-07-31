import { query } from "../config/database";

const MIGRATION_SQL = `
-- Create the site_configurations table if not exists
CREATE TABLE IF NOT EXISTS site_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    version INT NOT NULL DEFAULT 1,
    config_data JSONB NOT NULL,
    publisher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safely drop indexes if they exist to support re-running migrations cleanly
DROP INDEX IF EXISTS idx_single_active_draft;
DROP INDEX IF EXISTS idx_single_active_published;

-- Create partial unique indexes
CREATE UNIQUE INDEX idx_single_active_draft ON site_configurations (status) WHERE status = 'draft';
CREATE UNIQUE INDEX idx_single_active_published ON site_configurations (status) WHERE status = 'published';

-- Delete old rows to prevent duplication errors during seeding
DELETE FROM site_configurations WHERE status IN ('draft', 'published');

-- Seed initial published configuration
INSERT INTO site_configurations (status, version, config_data, published_at)
VALUES (
  'published',
  1,
  '{
    "site": {
      "name": "DESKTO",
      "description": "Premium Custom PC Builder & Repair Services",
      "contact": {
        "phone": "+91 62604 69111",
        "email": "support@deskto.in",
        "address": "Shop No. 22, Arvind Nagar, Gwalior, MP 474004",
        "whatsappNumber": "+916260469111"
      },
      "socials": {
        "instagram": "https://instagram.com/deskto",
        "youtube": "https://youtube.com/@deskto",
        "facebook": "https://facebook.com/deskto",
        "twitter": "https://twitter.com/deskto"
      },
      "businessHours": "Mon-Sat: 10AM-8PM"
    },
    "theme": {
      "primaryColor": "#FF1F45",
      "secondaryColor": "#0088ff",
      "backgroundColor": "#050505",
      "textColor": "#ffffff",
      "fontFamily": "Inter",
      "borderRadius": "0.625rem"
    },
    "features": {
      "enableECommerce": true,
      "enableRentals": true,
      "enableServiceRequests": true,
      "enableCustomBuilder": true,
      "enableBookingCalendar": false
    },
    "homepageLayout": [
      { "sectionId": "hero", "enabled": true, "displayOrder": 0 },
      { "sectionId": "services", "enabled": true, "displayOrder": 1 },
      { "sectionId": "workflow", "enabled": true, "displayOrder": 2 },
      { "sectionId": "featured-builds", "enabled": true, "displayOrder": 3 },
      { "sectionId": "brands", "enabled": true, "displayOrder": 4 },
      { "sectionId": "offers", "enabled": true, "displayOrder": 5 },
      { "sectionId": "news", "enabled": true, "displayOrder": 6 },
      { "sectionId": "testimonials", "enabled": true, "displayOrder": 7 },
      { "sectionId": "faq", "enabled": true, "displayOrder": 8 },
      { "sectionId": "location", "enabled": true, "displayOrder": 9 },
      { "sectionId": "footer", "enabled": true, "displayOrder": 10 }
    ]
  }'::jsonb,
  CURRENT_TIMESTAMP
);

-- Seed initial draft configuration
INSERT INTO site_configurations (status, version, config_data)
VALUES (
  'draft',
  1,
  '{
    "site": {
      "name": "DESKTO",
      "description": "Premium Custom PC Builder & Repair Services",
      "contact": {
        "phone": "+91 62604 69111",
        "email": "support@deskto.in",
        "address": "Shop No. 22, Arvind Nagar, Gwalior, MP 474004",
        "whatsappNumber": "+916260469111"
      },
      "socials": {
        "instagram": "https://instagram.com/deskto",
        "youtube": "https://youtube.com/@deskto",
        "facebook": "https://facebook.com/deskto",
        "twitter": "https://twitter.com/deskto"
      },
      "businessHours": "Mon-Sat: 10AM-8PM"
    },
    "theme": {
      "primaryColor": "#FF1F45",
      "secondaryColor": "#0088ff",
      "backgroundColor": "#050505",
      "textColor": "#ffffff",
      "fontFamily": "Inter",
      "borderRadius": "0.625rem"
    },
    "features": {
      "enableECommerce": true,
      "enableRentals": true,
      "enableServiceRequests": true,
      "enableCustomBuilder": true,
      "enableBookingCalendar": false
    },
    "homepageLayout": [
      { "sectionId": "hero", "enabled": true, "displayOrder": 0 },
      { "sectionId": "services", "enabled": true, "displayOrder": 1 },
      { "sectionId": "workflow", "enabled": true, "displayOrder": 2 },
      { "sectionId": "featured-builds", "enabled": true, "displayOrder": 3 },
      { "sectionId": "brands", "enabled": true, "displayOrder": 4 },
      { "sectionId": "offers", "enabled": true, "displayOrder": 5 },
      { "sectionId": "news", "enabled": true, "displayOrder": 6 },
      { "sectionId": "testimonials", "enabled": true, "displayOrder": 7 },
      { "sectionId": "faq", "enabled": true, "displayOrder": 8 },
      { "sectionId": "location", "enabled": true, "displayOrder": 9 },
      { "sectionId": "footer", "enabled": true, "displayOrder": 10 }
    ]
  }'::jsonb
);
`;

async function runMigration() {
  try {
    console.log("Running site configuration database migration...");
    await query(MIGRATION_SQL);
    console.log("✅ Site configuration database migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Site configuration database migration failed:", error);
    process.exit(1);
  }
}

runMigration();
