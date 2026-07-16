import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net";
const accounts = {
  customer: ["test4@gmail.com", "admin123"],
  admin: ["admin@deskto.com", "admin123"],
  staff: ["sales@deskto.com", "admin123"],
};

const browser = await chromium.launch({ headless: true });
const contexts = {};
const pages = {};
let orderNumber;
let cleanedUp = false;

async function login(role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/sign-in`, { waitUntil: "networkidle" });
  await page.locator('input[type="text"]').first().fill(accounts[role][0]);
  await page.locator('input[type="password"]').first().fill(accounts[role][1]);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(`**/dashboard/${role}`, { timeout: 15_000 });
  contexts[role] = context;
  pages[role] = page;
  console.log(`PASS: Test${role === "customer" ? 1 : role === "admin" ? 2 : 3} ${role} clean-device login`);
}

async function api(role, path, options = {}) {
  return pages[role].evaluate(async ({ path, options }) => {
    const token = localStorage.getItem("deskto_access_token");
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  }, { path, options });
}

async function expectDashboardOrder(role, path, suffix) {
  const page = pages[role];
  // Dashboards continuously poll shared state, so a strict network-idle wait
  // can race the next poll even when the page is fully rendered.
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  try {
    await page.getByText(suffix, { exact: false }).first().waitFor({ timeout: 15_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const raw = localStorage.getItem("deskto-dashboard-v1");
      const orders = raw ? (JSON.parse(raw).orders || []) : [];
      return {
        url: location.href,
        heading: document.body.innerText.slice(0, 500),
        orderIds: orders.slice(0, 8).map(o => o.id),
      };
    });
    console.error(`DIAGNOSTIC ${role}: ${JSON.stringify(diagnostics)}`);
    throw error;
  }
  console.log(`PASS: ${role} dashboard shows order ${suffix}`);
}

try {
  await login("customer");
  await login("admin");
  await login("staff");

  if (process.env.CLEANUP_ORDER) {
    const cleanup = await api("admin", `/api/orders/${encodeURIComponent(process.env.CLEANUP_ORDER)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    assert.equal(cleanup.status, 200, JSON.stringify(cleanup.body));
    console.log(`PASS: cleaned up prior interrupted order ${process.env.CLEANUP_ORDER}`);
  }

  const catalog = await api("customer", "/api/products?limit=100");
  assert.equal(catalog.status, 200);
  const product = catalog.body.products.find(p => p.stockQuantity > 0 && p.status === "published");
  assert.ok(product, "No in-stock published product available for order validation");
  const stockBefore = product.stockQuantity;

  const created = await api("customer", "/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: {
        name: "Test1 Customer",
        email: accounts.customer[0],
        phone: "9988776655",
        line1: "DESKTO production order validation",
        city: "Bhilai",
        state: "Chhattisgarh",
        postalCode: "490023",
        country: "India",
      },
      deliveryMethod: "ship",
      deliveryZone: "SAME_CITY",
      deliveryCharge: 0,
      notes: "Approved automated Test1-Test2-Test3 cross-device validation",
    }),
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  orderNumber = created.body.orderNumber;
  const suffix = orderNumber.slice(-8).toUpperCase();
  console.log(`PASS: Test1 selected ${product.sku} and raised ${orderNumber}`);

  const customerPlaced = await api("customer", "/api/orders/my?limit=50");
  const placedRow = customerPlaced.body.orders.find(o => o.orderNumber === orderNumber);
  assert.equal(placedRow.status, "placed");
  assert.equal(placedRow.items.length, 1);
  await expectDashboardOrder("customer", "/dashboard/customer/orders", suffix);

  const adminOrders = await api("admin", "/api/orders?limit=100");
  assert.equal(adminOrders.body.orders.find(o => o.orderNumber === orderNumber)?.items.length, 1);
  await expectDashboardOrder("admin", "/dashboard/admin/orders", suffix);

  const verified = await api("admin", `/api/orders/${encodeURIComponent(orderNumber)}/status`, { method: "PATCH", body: JSON.stringify({ status: "verified" }) });
  assert.equal(verified.body.status, "verified");
  assert.equal((await api("customer", "/api/orders/my?limit=50")).body.orders.find(o => o.orderNumber === orderNumber)?.status, "verified");
  console.log("PASS: Test2 admin -> verified; Test1 customer received verified");

  const staffOrders = await api("staff", "/api/orders?limit=100");
  assert.equal(staffOrders.body.orders.find(o => o.orderNumber === orderNumber)?.status, "verified");
  await expectDashboardOrder("staff", "/dashboard/staff/orders", suffix);

  for (const status of ["packing", "shipped", "delivered"]) {
    const updated = await api("staff", `/api/orders/${encodeURIComponent(orderNumber)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    assert.equal(updated.body.status, status);
    const customerView = await api("customer", "/api/orders/my?limit=50");
    assert.equal(customerView.body.orders.find(o => o.orderNumber === orderNumber)?.status, status);
    console.log(`PASS: Test3 staff -> ${status}; Test1 customer received ${status}`);
  }

  const adminDelivered = await api("admin", "/api/orders?limit=100");
  assert.equal(adminDelivered.body.orders.find(o => o.orderNumber === orderNumber)?.status, "delivered");
  console.log("PASS: Test2 admin dashboard API received delivered");

  const cancelled = await api("admin", `/api/orders/${encodeURIComponent(orderNumber)}/status`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
  assert.equal(cancelled.body.status, "cancelled");
  cleanedUp = true;
  assert.equal((await api("customer", "/api/orders/my?limit=50")).body.orders.find(o => o.orderNumber === orderNumber)?.status, "cancelled");
  assert.equal((await api("staff", "/api/orders?limit=100")).body.orders.find(o => o.orderNumber === orderNumber)?.status, "cancelled");

  const catalogAfter = await api("customer", "/api/products?limit=100");
  const stockAfter = catalogAfter.body.products.find(p => p.id === product.id)?.stockQuantity;
  assert.equal(stockAfter, stockBefore, "Product stock was not restored after test cancellation");
  console.log(`PASS: cleanup cancelled ${orderNumber}; stock restored to ${stockBefore}`);
  console.log("RESULT: 3-device production order lifecycle passed end to end");
} finally {
  if (orderNumber && !cleanedUp && pages.admin) {
    const cleanup = await api("admin", `/api/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    }).catch(() => null);
    if (cleanup?.status === 200) console.log(`PASS: failure cleanup cancelled ${orderNumber}`);
  }
  for (const context of Object.values(contexts)) await context.close().catch(() => {});
  await browser.close();
}
