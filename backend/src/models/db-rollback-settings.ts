import { query } from "../config/database";

const ROLLBACK_SQL = `
DROP TABLE IF EXISTS site_configurations CASCADE;
`;

async function runRollback() {
  try {
    console.log("Rolling back site configuration database tables...");
    await query(ROLLBACK_SQL);
    console.log("✅ Site configuration database rollback completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Site configuration database rollback failed:", error);
    process.exit(1);
  }
}

runRollback();
