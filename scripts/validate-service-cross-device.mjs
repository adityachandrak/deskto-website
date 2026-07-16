#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [routes, schema, api, types, data, servicesPage, orders] = await Promise.all([
  read("backend/src/routes/services.ts"),
  read("backend/src/models/schema.sql"),
  read("src/app/lib/api.ts"),
  read("src/app/lib/apiTypes.ts"),
  read("src/app/lib/dashboardData.ts"),
  read("src/app/ServicesPage.tsx"),
  read("backend/src/routes/orders.ts"),
]);

const checks = [];
function check(name, fn) {
  try { fn(); checks.push([name, true, ""]); }
  catch (error) { checks.push([name, false, error.message]); }
}

check("all nine service types are accepted", () => {
  for (const kind of ["repair", "pc-build", "assembly", "upgrade", "software", "rental", "delivery", "support", "sell"]) assert.match(routes, new RegExp(`'${kind}'`));
});
check("shared services schema is additive", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS services/);
  assert.match(schema, /ALTER TABLE services ADD COLUMN IF NOT EXISTS device_info/);
  assert.doesNotMatch(schema, /DROP TABLE services|TRUNCATE services/);
});
check("customer list returns identity, device data, quote, attachments, and technician", () => {
  assert.match(routes, /customerId: s\.user_id/);
  assert.match(routes, /deviceInfo,/);
  assert.match(routes, /attachments,/);
  assert.match(routes, /technicianId: s\.technician_id/);
});
check("S3 attachment upload and completion routes exist", () => {
  assert.match(routes, /attachments\/upload-url/);
  assert.match(routes, /PutObjectCommand/);
  assert.match(routes, /attachments\/complete/);
});
check("customer service actions are ownership checked", () => {
  assert.match(routes, /const owns = current\.user_id === req\.user!\.id/);
  assert.match(routes, /CUSTOMER_STATUSES/);
});
check("technician directory uses backend UUIDs", () => {
  assert.match(routes, /technicians\/list/);
  assert.match(api, /getTechnicians/);
  assert.match(data, /techniciansRes\.technicians/);
});
check("forms await production persistence", () => {
  assert.ok((servicesPage.match(/const submit = async \(\) =>/g) || []).length >= 8);
  assert.ok((servicesPage.match(/await add(?:Repair|PCBuild|Service)Request/g) || []).length >= 8);
});
check("dashboard mutations persist before local state", () => {
  assert.match(data, /const patchRepair = useCallback\(async[\s\S]*?await servicesApi\.update/);
  assert.match(data, /const patchPCBuild = useCallback\(async[\s\S]*?await servicesApi\.update/);
  assert.match(data, /const patchServiceRequest = useCallback\(async[\s\S]*?await servicesApi\.update/);
});
check("all dashboard collections hydrate from shared API", () => {
  assert.match(data, /apiServiceToRepair/);
  assert.match(data, /apiServiceToPCBuild/);
  assert.match(data, /apiServiceToDelivery/);
  assert.match(data, /apiServiceToFrontend/);
});
check("orders create shared delivery workflow", () => assert.match(orders, /service_type, status, title, description, device_info[\s\S]*?'delivery'/));
check("delivery updates sync back to order status", () => assert.match(routes, /updated\.service_type === 'delivery'[\s\S]*?UPDATE orders SET status/));
check("admin cleanup deletes test record and S3 attachments", () => {
  assert.match(routes, /router\.delete\('\/:identifier'/);
  assert.match(routes, /DeleteObjectCommand/);
});

for (const [name, pass, error] of checks) console.log(`${pass ? "✓" : "✗"} ${name}${pass ? "" : ` — ${error}`}`);
const failed = checks.filter(([, pass]) => !pass);
console.log(`Result: ${checks.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
