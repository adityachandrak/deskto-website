import { query } from "../config/database";

const MIGRATION_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
`;

async function runMigration() {
  try {
    console.log("Running login-lockout column migration...");
    await query(MIGRATION_SQL);
    console.log("✅ Login-lockout column migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Login-lockout column migration failed:", error);
    process.exit(1);
  }
}

runMigration();
