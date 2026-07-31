import { query } from "../config/database";

async function check() {
  try {
    const r = await query("SELECT id, email, password_hash, role FROM users");

    console.log(r.rows);
  } catch (err) {
    console.error(err);
  }
}

check();
