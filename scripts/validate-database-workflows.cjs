const fs = require("fs");
const path = require("path");
const { Client } = require("../backend/node_modules/pg");

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:55432/deskto_validation";

const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  customer: "22222222-2222-4222-8222-222222222222",
  staff: "33333333-3333-4333-8333-333333333333",
  category: "44444444-4444-4444-8444-444444444444",
  parentCategory: "44444444-4444-4444-8444-444444444445",
  brand: "55555555-5555-4555-8555-555555555555",
  product: "66666666-6666-4666-8666-666666666666",
  order: "77777777-7777-4777-8777-777777777777",
  orderItem: "88888888-8888-4888-8888-888888888888",
  service: "99999999-9999-4999-8999-999999999999",
  build: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  review: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  wishlist: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  refreshToken: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  auditLog: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  backup: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  staffProfile: "abababab-abab-4aba-8aba-abababababab",
};

const tableChecks = [
  {
    table: "users",
    insert: [
      `INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, status, email_verified)
       VALUES
       ($1, 'admin.validation@deskto.in', '+910000000001', 'hash', 'Admin', 'Validator', 'admin', 'active', TRUE),
       ($2, 'customer.validation@deskto.in', '+910000000002', 'hash', 'Customer', 'Validator', 'customer', 'active', TRUE),
       ($3, 'staff.validation@deskto.in', '+910000000003', 'hash', 'Staff', 'Validator', 'staff', 'active', TRUE)`,
      [ids.admin, ids.customer, ids.staff],
    ],
    update: [`UPDATE users SET first_name = 'Admin Updated' WHERE id = $1`, [ids.admin]],
    select: [`SELECT COUNT(*)::int AS count FROM users WHERE id IN ($1, $2, $3)`, [ids.admin, ids.customer, ids.staff], 3],
  },
  {
    table: "staff_profiles",
    insert: [
      `INSERT INTO staff_profiles (id, user_id, department, employee_id, hire_date, is_active)
       VALUES ($1, $2, 'Repairs', 'EMP-VALID-001', CURRENT_DATE, TRUE)`,
      [ids.staffProfile, ids.staff],
    ],
    update: [`UPDATE staff_profiles SET department = 'Service Desk' WHERE id = $1`, [ids.staffProfile]],
    select: [`SELECT COUNT(*)::int AS count FROM staff_profiles WHERE id = $1 AND user_id = $2`, [ids.staffProfile, ids.staff], 1],
  },
  {
    table: "categories",
    insert: [
      `INSERT INTO categories (id, name, slug, description, parent_id, sort_order)
       VALUES
       ($1, 'Validation Parent', 'validation-parent', 'Parent category', NULL, 1),
       ($2, 'Validation Category', 'validation-category', 'Child category', $1, 2)`,
      [ids.parentCategory, ids.category],
    ],
    update: [`UPDATE categories SET sort_order = 3 WHERE id = $1`, [ids.category]],
    select: [`SELECT COUNT(*)::int AS count FROM categories WHERE id IN ($1, $2)`, [ids.parentCategory, ids.category], 2],
  },
  {
    table: "brands",
    insert: [
      `INSERT INTO brands (id, name, slug, description, website, is_active)
       VALUES ($1, 'Validation Brand', 'validation-brand', 'Brand for DB validation', 'https://example.com', TRUE)`,
      [ids.brand],
    ],
    update: [`UPDATE brands SET description = 'Updated brand' WHERE id = $1`, [ids.brand]],
    select: [`SELECT COUNT(*)::int AS count FROM brands WHERE id = $1`, [ids.brand], 1],
  },
  {
    table: "products",
    insert: [
      `INSERT INTO products
       (id, sku, name, slug, description, price, compare_price, cost_price, category, brand, stock_quantity, specifications, tags, is_active, is_featured)
       VALUES ($1, 'VAL-001', 'Validation Product', 'validation-product', 'Product for DB validation', 1000.00, 1200.00, 700.00, 'Validation Category', 'Validation Brand', 10, $2::jsonb, ARRAY['validation'], TRUE, TRUE)`,
      [ids.product, JSON.stringify({ cpu: "validation" })],
    ],
    update: [`UPDATE products SET stock_quantity = 9 WHERE id = $1`, [ids.product]],
    select: [`SELECT COUNT(*)::int AS count FROM products WHERE id = $1 AND stock_quantity = 9`, [ids.product], 1],
  },
  {
    table: "orders",
    insert: [
      `INSERT INTO orders
       (id, order_number, user_id, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, payment_method, payment_status, shipping_address)
       VALUES ($1, 'ORD-DB-VALID-001', $2, 'placed', 1000.00, 180.00, 0.00, 0.00, 1180.00, 'upi', 'paid', $3::jsonb)`,
      [ids.order, ids.customer, JSON.stringify({ line1: "Validation Street", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" })],
    ],
    update: [`UPDATE orders SET status = 'verified' WHERE id = $1`, [ids.order]],
    select: [`SELECT COUNT(*)::int AS count FROM orders WHERE id = $1 AND status = 'verified'`, [ids.order], 1],
  },
  {
    table: "order_items",
    insert: [
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, specifications)
       VALUES ($1, $2, $3, 1, 1000.00, 1000.00, $4::jsonb)`,
      [ids.orderItem, ids.order, ids.product, JSON.stringify({ warranty: "1 year" })],
    ],
    update: [`UPDATE order_items SET quantity = 2, total_price = 2000.00 WHERE id = $1`, [ids.orderItem]],
    select: [`SELECT COUNT(*)::int AS count FROM order_items WHERE id = $1 AND quantity = 2`, [ids.orderItem], 1],
  },
  {
    table: "services",
    insert: [
      `INSERT INTO services
       (id, service_number, user_id, service_type, status, title, description, device_info, estimated_cost, technician_id)
       VALUES ($1, 'SRV-DB-VALID-001', $2, 'repair', 'submitted', 'Validation Service', 'Service for DB validation', $3::jsonb, 1499.00, $4)`,
      [ids.service, ids.customer, JSON.stringify({ device: "PC" }), ids.staff],
    ],
    update: [`UPDATE services SET status = 'diagnosing' WHERE id = $1`, [ids.service]],
    select: [`SELECT COUNT(*)::int AS count FROM services WHERE id = $1 AND status = 'diagnosing'`, [ids.service], 1],
  },
  {
    table: "pc_builds",
    insert: [
      `INSERT INTO pc_builds
       (id, build_number, user_id, status, title, use_case, budget_range, components, total_price, technician_id)
       VALUES ($1, 'BLD-DB-VALID-001', $2, 'submitted', 'Validation Build', 'Gaming', '100000-150000', $3::jsonb, 125000.00, $4)`,
      [ids.build, ids.customer, JSON.stringify({ cpu: "i7", gpu: "RTX" }), ids.staff],
    ],
    update: [`UPDATE pc_builds SET status = 'quoted' WHERE id = $1`, [ids.build]],
    select: [`SELECT COUNT(*)::int AS count FROM pc_builds WHERE id = $1 AND status = 'quoted'`, [ids.build], 1],
  },
  {
    table: "reviews",
    insert: [
      `INSERT INTO reviews (id, user_id, product_id, order_id, rating, title, content, is_verified_purchase, is_approved)
       VALUES ($1, $2, $3, $4, 5, 'Validation Review', 'Review for DB validation', TRUE, TRUE)`,
      [ids.review, ids.customer, ids.product, ids.order],
    ],
    update: [`UPDATE reviews SET helpful_count = 1 WHERE id = $1`, [ids.review]],
    select: [`SELECT COUNT(*)::int AS count FROM reviews WHERE id = $1 AND helpful_count = 1`, [ids.review], 1],
  },
  {
    table: "wishlists",
    insert: [
      `INSERT INTO wishlists (id, user_id, product_id)
       VALUES ($1, $2, $3)`,
      [ids.wishlist, ids.customer, ids.product],
    ],
    update: null,
    select: [`SELECT COUNT(*)::int AS count FROM wishlists WHERE id = $1`, [ids.wishlist], 1],
  },
  {
    table: "refresh_tokens",
    insert: [
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked)
       VALUES ($1, $2, 'refresh-db-validation-token', NOW() + INTERVAL '7 days', FALSE)`,
      [ids.refreshToken, ids.customer],
    ],
    update: [`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [ids.refreshToken]],
    select: [`SELECT COUNT(*)::int AS count FROM refresh_tokens WHERE id = $1 AND revoked = TRUE`, [ids.refreshToken], 1],
  },
  {
    table: "audit_logs",
    insert: [
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, 'db_validation', 'products', $3, $4::jsonb, $5::jsonb, '127.0.0.1', 'database-validator')`,
      [ids.auditLog, ids.admin, ids.product, JSON.stringify({ stock: 10 }), JSON.stringify({ stock: 9 })],
    ],
    update: [`UPDATE audit_logs SET action = 'db_validation_updated' WHERE id = $1`, [ids.auditLog]],
    select: [`SELECT COUNT(*)::int AS count FROM audit_logs WHERE id = $1 AND action = 'db_validation_updated'`, [ids.auditLog], 1],
  },
  {
    table: "backup_records",
    insert: [
      `INSERT INTO backup_records (id, backup_name, backup_type, file_size, file_url, status)
       VALUES ($1, 'db-validation-backup.json', 'full', 2048, '/api/backup/export', 'completed')`,
      [ids.backup],
    ],
    update: [`UPDATE backup_records SET status = 'failed' WHERE id = $1`, [ids.backup]],
    select: [`SELECT COUNT(*)::int AS count FROM backup_records WHERE id = $1 AND status = 'failed'`, [ids.backup], 1],
  },
];

const deleteOrder = [
  ["backup_records", ids.backup],
  ["audit_logs", ids.auditLog],
  ["refresh_tokens", ids.refreshToken],
  ["wishlists", ids.wishlist],
  ["reviews", ids.review],
  ["pc_builds", ids.build],
  ["services", ids.service],
  ["order_items", ids.orderItem],
  ["orders", ids.order],
  ["products", ids.product],
  ["brands", ids.brand],
  ["categories", ids.category],
  ["categories", ids.parentCategory],
  ["staff_profiles", ids.staffProfile],
  ["users", ids.admin],
  ["users", ids.customer],
  ["users", ids.staff],
];

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  const results = [];
  async function step(table, action, fn) {
    try {
      await fn();
      results.push({ table, action, ok: true });
      console.log(`PASS ${table} - ${action}`);
    } catch (error) {
      results.push({ table, action, ok: false, error: error.message });
      console.log(`FAIL ${table} - ${action}: ${error.message}`);
    }
  }

  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");

    const schemaPath = path.join(__dirname, "../backend/src/models/schema.sql");
    await client.query(fs.readFileSync(schemaPath, "utf8"));

    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const schemaTables = tableResult.rows.map(row => row.table_name);

    await step("schema", "all expected tables exist", async () => {
      const expected = tableChecks.map(check => check.table).sort();
      const missing = expected.filter(table => !schemaTables.includes(table));
      if (missing.length) throw new Error(`Missing tables: ${missing.join(", ")}`);
    });

    for (const check of tableChecks) {
      await step(check.table, "insert", async () => {
        await client.query(check.insert[0], check.insert[1]);
      });

      if (check.update) {
        await step(check.table, "update", async () => {
          await client.query(check.update[0], check.update[1]);
        });
      }

      await step(check.table, "select", async () => {
        const result = await client.query(check.select[0], check.select[1]);
        const actual = Number(result.rows[0]?.count || 0);
        if (actual !== check.select[2]) {
          throw new Error(`Expected count ${check.select[2]}, got ${actual}`);
        }
      });
    }

    await step("constraints", "wishlist unique constraint rejects duplicate", async () => {
      try {
        await client.query(`INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)`, [ids.customer, ids.product]);
      } catch (error) {
        if (error.code === "23505") return;
        throw error;
      }
      throw new Error("Duplicate wishlist insert unexpectedly succeeded");
    });

    await step("constraints", "foreign key rejects orphan order item", async () => {
      try {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ('12121212-1212-4121-8121-121212121212', $1, 1, 1.00, 1.00)`,
          [ids.product],
        );
      } catch (error) {
        if (error.code === "23503") return;
        throw error;
      }
      throw new Error("Orphan order item unexpectedly succeeded");
    });

    for (const [table, id] of deleteOrder) {
      await step(table, "delete", async () => {
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      });
    }

    const failed = results.filter(result => !result.ok);
    const tableCount = tableChecks.length;

    console.log("\nDatabase workflow validation summary");
    console.log(`Tables expected by validator: ${tableCount}`);
    console.log(`Tables found in executable schema: ${schemaTables.length}`);
    console.log(`Steps checked: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Tables: ${schemaTables.join(", ")}`);

    if (failed.length) {
      console.log(JSON.stringify(failed, null, 2));
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
