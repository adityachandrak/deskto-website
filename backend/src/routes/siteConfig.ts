import { Router, Response } from "express";
import { query, getClient } from "../config/database";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Whitelist of valid homepage sections
const VALID_SECTIONS = new Set([
  "hero",
  "services",
  "workflow",
  "featured-builds",
  "brands",
  "offers",
  "news",
  "testimonials",
  "faq",
  "location",
  "footer",
]);

// Helper to escape basic HTML tags to prevent cross-site scripting (XSS)
function sanitizeText(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Deep text fields sanitizer
function sanitizeConfigPayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;

  const sanitized = JSON.parse(JSON.stringify(payload)); // Deep clone

  if (sanitized.site) {
    if (typeof sanitized.site.name === "string") {
      sanitized.site.name = sanitizeText(sanitized.site.name);
    }
    if (typeof sanitized.site.description === "string") {
      sanitized.site.description = sanitizeText(sanitized.site.description);
    }
    if (sanitized.site.contact) {
      if (typeof sanitized.site.contact.phone === "string") {
        sanitized.site.contact.phone = sanitizeText(sanitized.site.contact.phone);
      }
      if (typeof sanitized.site.contact.email === "string") {
        sanitized.site.contact.email = sanitizeText(sanitized.site.contact.email);
      }
      if (typeof sanitized.site.contact.address === "string") {
        sanitized.site.contact.address = sanitizeText(sanitized.site.contact.address);
      }
    }
  }
  return sanitized;
}

// Validate configuration schema
function validateConfigPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be a JSON object" };
  }

  // 1. Theme Hex Validation
  if (payload.theme) {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const colors = ["primaryColor", "secondaryColor", "backgroundColor", "textColor"];
    for (const key of colors) {
      const color = payload.theme[key];
      if (color !== undefined && (typeof color !== "string" || !hexPattern.test(color))) {
        return { valid: false, error: `Invalid color format for theme.${key}. Must be a valid Hex string (e.g. #FF1F45)` };
      }
    }
  }

  // 2. Homepage Sections Whitelist Validation
  if (payload.homepageLayout) {
    if (!Array.isArray(payload.homepageLayout)) {
      return { valid: false, error: "homepageLayout must be an array of sections" };
    }
    for (const item of payload.homepageLayout) {
      if (!item || typeof item !== "object") {
        return { valid: false, error: "Each section in homepageLayout must be an object" };
      }
      if (typeof item.sectionId !== "string") {
        return { valid: false, error: "Each layout section must have a string sectionId" };
      }
      if (!VALID_SECTIONS.has(item.sectionId)) {
        return { valid: false, error: `Invalid layout sectionId: "${item.sectionId}". Whitelist: ${Array.from(VALID_SECTIONS).join(", ")}` };
      }
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Public Endpoint: GET /api/config
// ─────────────────────────────────────────────────────────────────────────────
router.get("/config", async (req, res) => {
  try {
    const result = await query(
      `SELECT version, published_at, config_data 
       FROM site_configurations 
       WHERE status = 'published' 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "No published configuration found" });
      return;
    }

    const { version, published_at, config_data } = result.rows[0];

    // Modern Cache-Control: Cache for 5s, stale-while-revalidate for 10s
    res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=10");
    res.json({
      version,
      publishedAt: published_at,
      config: config_data,
    });
  } catch (error: any) {
    console.error("[config] public get failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin Endpoint: GET /api/admin/config (Protected)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/admin/config",
  authenticate as any,
  authorize("admin") as any,
  async (req: AuthRequest, res) => {
    try {
      const draftResult = await query(
        `SELECT id, version, config_data, updated_at 
         FROM site_configurations 
         WHERE status = 'draft' 
         LIMIT 1`
      );

      const publishedResult = await query(
        `SELECT c.id, c.version, c.published_at, u.name as publisher_name 
         FROM site_configurations c
         LEFT JOIN users u ON c.publisher_id = u.id
         WHERE c.status = 'published' 
         LIMIT 1`
      );

      res.json({
        draft: draftResult.rows[0] || null,
        published: publishedResult.rows[0] || null,
      });
    } catch (error: any) {
      console.error("[config] admin get failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Admin Endpoint: PUT /api/admin/config/draft (Protected)
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/admin/config/draft",
  authenticate as any,
  authorize("admin") as any,
  async (req: AuthRequest, res) => {
    try {
      const { configData } = req.body;

      // Validate inputs
      const validation = validateConfigPayload(configData);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const sanitized = sanitizeConfigPayload(configData);

      // Perform update or insert of the single active draft
      const checkDraft = await query("SELECT id FROM site_configurations WHERE status = 'draft'");

      let result;
      if (checkDraft.rows.length > 0) {
        result = await query(
          `UPDATE site_configurations 
           SET config_data = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE status = 'draft' 
           RETURNING id, version, config_data, updated_at`,
          [sanitized]
        );
      } else {
        result = await query(
          `INSERT INTO site_configurations (status, version, config_data) 
           VALUES ('draft', 1, $1) 
           RETURNING id, version, config_data, updated_at`,
          [sanitized]
        );
      }

      res.json({
        message: "Draft configuration saved successfully",
        draft: result.rows[0],
      });
    } catch (error: any) {
      console.error("[config] admin put draft failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Admin Endpoint: POST /api/admin/config/publish (Protected)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/admin/config/publish",
  authenticate as any,
  authorize("admin") as any,
  async (req: AuthRequest, res) => {
    const client = await getClient();
    try {
      // 1. Fetch current draft
      const draftResult = await client.query(
        "SELECT config_data, version FROM site_configurations WHERE status = 'draft' LIMIT 1"
      );

      if (draftResult.rows.length === 0) {
        res.status(400).json({ error: "No draft configuration available to publish" });
        return;
      }

      const draft = draftResult.rows[0];

      // Validate schema before publishing
      const validation = validateConfigPayload(draft.config_data);
      if (!validation.valid) {
        res.status(400).json({ error: `Cannot publish: ${validation.error}` });
        return;
      }

      // 2. Fetch active published config to calculate new version and save old values for audit
      const publishedResult = await client.query(
        "SELECT id, version, config_data FROM site_configurations WHERE status = 'published' LIMIT 1"
      );

      const oldPublished = publishedResult.rows[0] || null;
      const nextVersion = oldPublished ? oldPublished.version + 1 : 1;

      // Start database transaction
      await client.query("BEGIN");

      // 3. Mark the old published version as archived
      if (oldPublished) {
        await client.query(
          "UPDATE site_configurations SET status = 'archived' WHERE id = $1",
          [oldPublished.id]
        );
      }

      // 4. Create new published row
      const insertResult = await client.query(
        `INSERT INTO site_configurations (status, version, config_data, publisher_id, published_at) 
         VALUES ('published', $1, $2, $3, CURRENT_TIMESTAMP) 
         RETURNING id, version, published_at, config_data`,
        [nextVersion, draft.config_data, req.user?.id]
      );

      const newPublished = insertResult.rows[0];

      // 5. Update draft version to match new version
      await client.query(
        "UPDATE site_configurations SET version = $1 WHERE status = 'draft'",
        [nextVersion]
      );

      // 6. Record in audit_logs
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) 
         VALUES ($1, 'publish_site_config', 'site_config', $2, $3, $4, $5, $6)`,
        [
          req.user?.id,
          newPublished.id,
          oldPublished ? JSON.stringify(oldPublished.config_data) : null,
          JSON.stringify(newPublished.config_data),
          req.ip,
          req.headers["user-agent"] || null,
        ]
      );

      await client.query("COMMIT");

      res.json({
        message: "Draft configuration published successfully",
        version: newPublished.version,
        publishedAt: newPublished.published_at,
        config: newPublished.config_data,
      });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("[config] admin publish failed:", error);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

export default router;
