#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = (process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net").replace(/\/$/, "");
const password = process.env.E2E_PASSWORD || "admin123";
const candidates = {
  customer: ["test1@gmail.com", "test4@gmail.com"],
  admin: ["test2@gmail.com", "admin@deskto.com"],
  staff: ["test3@gmail.com", "sales@deskto.com"],
};
const sessions = {};
const createdServices = [];
let orderNumber = "";

async function raw(path, { method = "GET", role, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(role ? { Authorization: `Bearer ${sessions[role].token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function login(role) {
  for (const identifier of candidates[role]) {
    const result = await raw("/api/auth/login", { method: "POST", body: { identifier, password } });
    if (result.status === 200) {
      sessions[role] = { token: result.body.accessToken, email: identifier };
      console.log(`PASS ${role} isolated API login as ${identifier}`);
      return;
    }
  }
  throw new Error(`No seeded ${role} account accepted the expected test password`);
}

function ok(result, status = 200) {
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}

const amount = value => Number(value || 0);
const namedValue = (rows, name) => amount((rows || []).find(row => row.name === name)?.value);
const sumWeekly = rows => (rows || []).reduce((sum, row) => sum + amount(row.revenue), 0);

async function overview(role = "admin") {
  return ok(await raw("/api/admin/overview", { role }));
}

async function assertBrowserUI() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="text"]').first().fill(sessions.admin.email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL("**/dashboard/admin", { timeout: 20_000 });
    const serviceChart = page.getByText("Sales by Services", { exact: true });
    try {
      await serviceChart.waitFor({ timeout: 20_000 });
    } catch {
      await page.reload({ waitUntil: "domcontentloaded" });
      await serviceChart.waitFor({ timeout: 20_000 });
    }
    for (const label of ["Today's Sales", "Orders Today", "Revenue (Delivered)", "Open Repairs", "Active PC Builds", "Open Services", "Pending Deliveries", "Staff", "Weekly Revenue", "Sales by Category"]) {
      await page.getByText(label, { exact: true }).first().waitFor({ timeout: 10_000 });
    }
    console.log("PASS admin browser renders all live KPI cards and three analytics charts");

    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: /Reset Dashboard/i }).click();
    await page.getByText("Sales by Services", { exact: true }).waitFor({ timeout: 20_000 });
    assert.match(page.url(), /\/dashboard\/admin(?:#overview)?$/);
    assert.equal(await page.evaluate(() => Boolean(localStorage.getItem("deskto_access_token"))), true);
    console.log("PASS Reset Dashboard returns to Overview, preserves authentication, and reloads server analytics");

    await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Show Filters/i }).click();
    const labels = ["Gaming PC", "Desktop PC", "Gaming Laptop", "Laptop", "Monitor", "CPU", "GPU", "RAM", "NVMe", "Motherboard", "PSU", "Cabinet", "Keyboard", "Mouse", "Headset", "Router", "UPS", "Printer", "Scanner", "HDD", "SSD", "Accessories", "Others"];
    for (const label of labels) await page.getByText(label, { exact: true }).first().waitFor({ timeout: 10_000 });
    const categoryButtons = page.getByText("Category", { exact: true }).locator("xpath=following-sibling::div[1]/button");
    const actualLabels = (await categoryButtons.allTextContents()).map(label => label.trim());
    assert.deepEqual(actualLabels, labels);
    console.log("PASS customer Shop Products shows all 23 requested categories in the requested order");
    await context.close();
  } finally {
    await browser.close();
  }
}

try {
  await Promise.all([login("customer"), login("admin"), login("staff")]);
  const baseline = await overview();
  const staffBaseline = await overview("staff");
  assert.equal(staffBaseline.orders_today, baseline.orders_today);
  assert.equal((await raw("/api/admin/overview", { role: "customer" })).status, 403);
  console.log("PASS admin and staff receive the same no-store analytics; customer is role-blocked");

  if (process.env.UI_ONLY === "true") {
    await assertBrowserUI();
    console.log("RESULT live overview browser reset, analytics, categories, and role access passed end to end");
  } else {
  const catalog = ok(await raw("/api/products?limit=200", { role: "customer" }));
  const product = catalog.products.find(item => item.status === "published" && amount(item.stockQuantity) > 0);
  assert.ok(product, "No in-stock published product is available for analytics validation");
  const createdOrder = ok(await raw("/api/orders", {
    method: "POST", role: "customer", body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { name: "Test1", email: sessions.customer.email, phone: "9988776655", line1: "DESKTO analytics E2E", city: "Bhilai", state: "Chhattisgarh", postalCode: "490023", country: "India" },
      deliveryMethod: "ship", deliveryZone: "SAME_CITY", deliveryCharge: 0,
      notes: "Approved dashboard analytics validation",
    },
  }), 201);
  orderNumber = createdOrder.orderNumber;
  const afterOrder = await overview("staff");
  assert.equal(amount(afterOrder.orders_today), amount(baseline.orders_today) + 1);
  assert.equal(amount(afterOrder.sales_today), amount(baseline.sales_today) + amount(createdOrder.totalAmount));
  assert.equal(sumWeekly(afterOrder.weeklyRevenue), sumWeekly(baseline.weeklyRevenue) + amount(createdOrder.totalAmount));
  assert.equal(namedValue(afterOrder.salesByCategory, product.category), namedValue(baseline.salesByCategory, product.category) + amount(product.price));
  assert.equal(amount(afterOrder.pending_deliveries), amount(baseline.pending_deliveries) + 1);
  console.log("PASS Test1 order updates orders today, today's sales, weekly revenue, category sales, and pending deliveries for Test2/Test3");

  const stamp = Date.now();
  for (const serviceType of ["repair", "pc-build", "assembly"]) {
    const service = ok(await raw("/api/services", {
      method: "POST", role: "customer", body: {
        serviceType, title: `DESKTO-ANALYTICS-E2E-${serviceType}-${stamp}`,
        description: `Analytics KPI validation for ${serviceType}`,
        deviceInfo: { customerName: "Test1", customerEmail: sessions.customer.email, customerPhone: "9988776655", requirements: "Analytics E2E" },
      },
    }), 201);
    createdServices.push(service);
  }
  const afterServices = await overview();
  assert.equal(amount(afterServices.open_repairs), amount(afterOrder.open_repairs) + 1);
  assert.equal(amount(afterServices.active_pc_builds), amount(afterOrder.active_pc_builds) + 1);
  assert.equal(amount(afterServices.open_services), amount(afterOrder.open_services) + 1);
  console.log("PASS Test1 service requests update open repairs, active PC builds, and open services for Test2 admin");

  const assembly = createdServices.find(item => item.serviceType === "assembly");
  ok(await raw(`/api/services/${encodeURIComponent(assembly.serviceNumber)}`, { method: "PATCH", role: "staff", body: { status: "delivered", finalCost: 4321 } }));
  const afterServiceSale = await overview();
  assert.equal(namedValue(afterServiceSale.salesByService, "assembly"), namedValue(afterServices.salesByService, "assembly") + 4321);
  assert.equal(amount(afterServiceSale.open_services), amount(afterServices.open_services) - 1);
  console.log("PASS Test3 completion updates Sales by Services and closes the open-service KPI for Test2");

  ok(await raw(`/api/orders/${encodeURIComponent(orderNumber)}/status`, { method: "PATCH", role: "staff", body: { status: "delivered" } }));
  const delivered = await overview();
  assert.equal(amount(delivered.delivered_revenue), amount(afterServiceSale.delivered_revenue) + amount(createdOrder.totalAmount));
  console.log("PASS Test3 delivery updates delivered revenue for Test2 admin");

  const staffUsers = ok(await raw("/api/admin/users?role=staff", { role: "admin" }));
  assert.equal(amount(delivered.staff), staffUsers.users.filter(user => user.status === "active").length);
  console.log("PASS Staff KPI matches the shared active staff directory");

  await assertBrowserUI();
  console.log("RESULT live overview analytics, reset, categories, and three-role propagation passed end to end");
  }
} finally {
  if (sessions.admin) {
    for (const service of createdServices) {
      await raw(`/api/services/${encodeURIComponent(service.serviceNumber)}`, { method: "DELETE", role: "admin" }).catch(() => null);
    }
    if (orderNumber) {
      const services = await raw("/api/services?limit=200", { role: "admin" }).catch(() => null);
      for (const service of services?.body?.services || []) {
        if (service.serviceType === "delivery" && service.deviceInfo?.orderNumber === orderNumber) {
          await raw(`/api/services/${encodeURIComponent(service.serviceNumber)}`, { method: "DELETE", role: "admin" }).catch(() => null);
        }
      }
      await raw(`/api/orders/${encodeURIComponent(orderNumber)}/status`, { method: "PATCH", role: "admin", body: { status: "cancelled" } }).catch(() => null);
    }
  }
}
