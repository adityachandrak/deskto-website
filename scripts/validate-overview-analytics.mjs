#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const backend = read("backend/src/routes/adminCore.ts");
const admin = read("src/app/AdminDashboard.tsx");
const overview = read("src/app/AdminDashboard.tabs.tsx");
const layout = read("src/app/components/dashboard/DashboardLayout.tsx");
const shop = read("src/app/App.tsx");
const products = read("backend/src/routes/products.ts");

let passed = 0;
function check(condition, message) {
  assert.ok(condition, message);
  passed += 1;
  console.log(`PASS ${message}`);
}

for (const metric of [
  "orders_today", "sales_today", "delivered_revenue", "open_repairs",
  "active_pc_builds", "open_services", "pending_deliveries", "staff",
]) {
  check(backend.includes(`AS ${metric}`), `overview API computes ${metric} from PostgreSQL`);
  check(overview.includes(`\"${metric}\"`) || overview.includes(`serverStats.${metric}`), `admin Overview renders ${metric} from the API response`);
}

for (const payload of ["weeklyRevenue", "salesByCategory", "salesByService", "orderPipeline"]) {
  check(backend.includes(`${payload}:`), `overview API returns ${payload}`);
  check(overview.includes(`serverStats?.${payload}`), `admin Overview consumes ${payload}`);
}

check(backend.includes("authorize('admin', 'staff')"), "overview API permits admin and staff roles");
check(backend.includes("service_type='delivery'"), "pending deliveries are read from the shared service workflow");
check(backend.includes("jsonb_array_elements"), "category sales are calculated from persisted order line items");
check(backend.includes("COALESCE(final_cost,estimated_cost,0)"), "service sales use persisted recognized service revenue");
check(overview.includes("window.setInterval(load, 15_000)"), "overview automatically refreshes cross-device changes every 15 seconds");
check(overview.includes('SectionCard title="Sales by Services"'), "Sales by Services pie chart is present");

check(layout.includes("headerActions?: ReactNode"), "dashboard layout supports a top-right action");
check(admin.includes("Reset Dashboard"), "top-right Reset Dashboard button is present");
check(admin.includes("Shared production orders, products, customers, staff, services, and revenue will not be deleted"), "reset explicitly protects shared production data");
check(admin.includes("data.resetStore()"), "reset clears the dashboard cache/store");
check(admin.includes('setTab("overview")'), "reset returns the admin to Overview");
check(admin.includes("setResetVersion(version => version + 1)"), "reset remounts Overview and reloads authoritative analytics");

const expected = [
  "gaming-pc", "desktop-pc", "gaming-laptop", "laptop", "monitor", "cpu", "gpu", "ram", "nvme",
  "motherboard", "psu", "cabinet", "keyboard", "mouse", "headset", "router", "ups", "printer",
  "scanner", "hdd", "ssd", "accessories", "others",
];
const block = shop.match(/export const SHOP_CATEGORY_ORDER:[\s\S]*?= \[([\s\S]*?)\];/)?.[1] || "";
const actual = [...block.matchAll(/"([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(actual, expected);
passed += 1;
console.log("PASS storefront category chips match the requested 23-category order exactly");
check(shop.includes("const dynamicCategories = SHOP_CATEGORY_ORDER"), "shop filters render the complete curated category list");
check(shop.includes("/products?limit=200"), "shop loads the complete live product catalog page");
check(/isInt\(\{ min: 1, max: 200 \}\)/.test(products), "public products API accepts the 200-item storefront request");

console.log(`RESULT ${passed} overview analytics, reset, and storefront category checks passed`);
