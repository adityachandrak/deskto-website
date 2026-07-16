#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [orders, app, data, staff, admin, customer, schema, mapper, staffDashboard, adminDashboard, customerDashboard] = await Promise.all([
  read("backend/src/routes/orders.ts"),
  read("src/app/App.tsx"),
  read("src/app/lib/dashboardData.ts"),
  read("src/app/StaffDashboard.tabs.tsx"),
  read("src/app/AdminDashboard.tabs.tsx"),
  read("src/app/CustomerDashboard.tabs.tsx"),
  read("backend/src/models/schema.sql"),
  read("src/app/lib/apiTypes.ts"),
  read("src/app/StaffDashboard.tsx"),
  read("src/app/AdminDashboard.tsx"),
  read("src/app/CustomerDashboard.tsx"),
]);

const checks = [];
function check(name, fn) {
  try { fn(); checks.push([name, "PASS"]); }
  catch (error) { checks.push([name, `FAIL: ${error.message}`]); }
}

check("schema stores order items in orders.items JSONB", () => assert.match(schema, /items JSONB NOT NULL DEFAULT '\[\]'/));
check("API no longer depends on missing order_items table", () => assert.doesNotMatch(orders, /\b(?:FROM|INTO) order_items\b/));
check("order create uses a DB transaction", () => assert.match(orders, /client\.query\('BEGIN'\)[\s\S]*?INSERT INTO orders[\s\S]*?client\.query\('COMMIT'\)/));
check("order create writes canonical JSONB items", () => assert.match(orders, /shipping_address, items, notes/));
check("customer and staff/admin lists return items", () => assert.ok((orders.match(/items: normalizeStoredItems\(o\.items\)/g) || []).length >= 2));
check("API orders preserve customer identity for customer dashboard filtering", () => {
  assert.ok((orders.match(/customerId: o\.user_id/g) || []).length >= 2);
  assert.match(mapper, /customerId: o\.customerId \|\| ""/);
});
check("customer may only cancel own early-stage order", () => assert.match(orders, /Customers can only cancel placed or verified orders/));
check("cancellation restores reserved stock once", () => assert.match(orders, /current\.status !== 'cancelled'[\s\S]*?stock_quantity = p\.stock_quantity \+ restored\.quantity/));
check("checkout never reports local-only success", () => {
  assert.match(app, /if \(!isApiAuthenticated\(\) \|\| !serverOrder\)/);
  assert.doesNotMatch(app, /Order saved locally/);
});
check("status mutation persists before local UI update", () => assert.match(data, /await ordersApi\.updateStatus\(orderId, status\)[\s\S]*?setStore/));
check("dashboards poll shared data every five seconds", () => assert.match(data, /setInterval\(\(\) => hydrateFromBackend\(\), 5_000\)/));
check("staff has backend-connected order advance control", () => {
  assert.match(staff, /updateOrderStatus: \(id: string, status: Order\["status"\]\) => Promise<void>/);
  assert.match(staff, /Order advanced to/);
});
check("admin surfaces failed status sync", () => assert.match(admin, /Order status update failed/));
check("customer awaits cancellation result", () => assert.match(customer, /await updateOrderStatus\(active\.id, "cancelled"\)/));
check("hydrated order timeline reflects shared status", () => assert.match(mapper, /trackingSteps: statusOrder\.map/));
check("dashboard deep links synchronize the requested tab", () => {
  for (const source of [staffDashboard, adminDashboard, customerDashboard]) {
    assert.match(source, /useEffect\(\(\) => \{[\s\S]*?if \(initialTab\) setTab\(/);
  }
});

for (const [name, result] of checks) console.log(`${result.startsWith("PASS") ? "✓" : "✗"} ${name}${result === "PASS" ? "" : ` — ${result}`}`);
const failures = checks.filter(([, result]) => result !== "PASS");
console.log(`Result: ${checks.length - failures.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
