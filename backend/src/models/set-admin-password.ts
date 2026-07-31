import { query } from "../config/database";
import bcrypt from "bcryptjs";

async function run() {
  try {
    const hash = await bcrypt.hash("admin123", 10);
    await query("UPDATE users SET password_hash = $1 WHERE email = 'admin@deskto.com'", [hash]);
    await query("UPDATE users SET password_hash = $1 WHERE email = 'test4@gmail.com'", [hash]);
    console.log("✅ Admin and Customer passwords reset in database successfully!");
  } catch (error) {
    console.error("❌ Failed to reset passwords:", error);
  }
}

run();
