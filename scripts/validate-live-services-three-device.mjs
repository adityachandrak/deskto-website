#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net";
const accounts = {
  customer: ["test4@gmail.com", "admin123"],
  admin: ["admin@deskto.com", "admin123"],
  staff: ["sales@deskto.com", "admin123"],
};
const kinds = ["repair", "pc-build", "assembly", "upgrade", "software", "rental", "delivery", "support", "sell"];
const tabs = {
  customer: { repair: "repairs", "pc-build": "builds", assembly: "assembly", upgrade: "upgrades", software: "software", rental: "rentals", support: "support", sell: "sell" },
  admin: { repair: "repairs", "pc-build": "builds", assembly: "assembly", upgrade: "upgrades", software: "software", rental: "rentals", delivery: "deliveries", support: "support", sell: "marketplace" },
  staff: { repair: "repairs", "pc-build": "builds", assembly: "assembly", upgrade: "upgrades", software: "software", rental: "rentals", delivery: "deliveries", support: "support", sell: "sell" },
};

const browser = await chromium.launch({ headless: true });
const pages = {};
const contexts = {};
const created = [];

async function login(role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="text"]').first().fill(accounts[role][0]);
  await page.locator('input[type="password"]').first().fill(accounts[role][1]);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(`**/dashboard/${role}`, { timeout: 20_000 });
  contexts[role] = context;
  pages[role] = page;
  console.log(`PASS login ${role} in isolated browser context`);
}

async function api(role, path, options = {}) {
  return pages[role].evaluate(async ({ path, options }) => {
    const token = localStorage.getItem("deskto_access_token");
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  }, { path, options });
}

async function visible(role, record) {
  const kind = record.serviceType;
  const tab = tabs[role][kind];
  if (!tab) return;
  const page = pages[role];
  const suffix = record.serviceNumber.slice(-8).toUpperCase();
  await page.goto(`${base}/dashboard/${role}/${tab}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(({ suffix, title }) => {
    const text = document.body.innerText;
    return text.includes(suffix) || text.includes(title);
  }, { suffix, title: record.title }, { timeout: 20_000 });
  console.log(`PASS ${role} ${kind} dashboard shows ${suffix}`);
}

async function uploadPhoto(record) {
  const presign = await api("customer", `/api/services/${encodeURIComponent(record.serviceNumber)}/attachments/upload-url`, {
    method: "POST", body: JSON.stringify({ fileName: `${record.serviceType}-proof.png`, contentType: "image/png" }),
  });
  assert.equal(presign.status, 200, JSON.stringify(presign.body));
  const uploadStatus = await pages.customer.evaluate(async ({ uploadUrl }) => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), c => c.charCodeAt(0));
    const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: new Blob([bytes], { type: "image/png" }) });
    return response.status;
  }, { uploadUrl: presign.body.uploadUrl });
  assert.ok(uploadStatus >= 200 && uploadStatus < 300, `S3 upload failed: ${uploadStatus}`);
  const complete = await api("customer", `/api/services/${encodeURIComponent(record.serviceNumber)}/attachments/complete`, {
    method: "POST", body: JSON.stringify({ objectKey: presign.body.objectKey, fileName: `${record.serviceType}-proof.png`, contentType: "image/png" }),
  });
  assert.equal(complete.status, 200, JSON.stringify(complete.body));
  assert.equal(complete.body.attachments.length, 1);
  const image = await pages.customer.request.get(complete.body.attachments[0].url);
  assert.equal(image.status(), 200);
  console.log(`PASS ${record.serviceType} photo uploaded to S3 and readable through CDN`);
}

try {
  await login("customer");
  await login("admin");
  await login("staff");

  // Remove records from earlier interrupted diagnostics before the final run.
  const existing = await api("admin", "/api/services?limit=100");
  for (const row of existing.body.services.filter(row => String(row.title).startsWith("DESKTO-E2E-"))) {
    await api("admin", `/api/services/${encodeURIComponent(row.serviceNumber)}`, { method: "DELETE" });
  }

  const stamp = Date.now();
  for (const kind of kinds) {
    const result = await api("customer", "/api/services", {
      method: "POST",
      body: JSON.stringify({
        serviceType: kind,
        title: `DESKTO-E2E-${kind}-${stamp}`,
        description: `Approved cross-device production validation for ${kind}`,
        deviceInfo: {
          customerName: "Test1 Customer", customerEmail: accounts.customer[0], customerPhone: "9988776655",
          deviceType: kind === "pc-build" ? "Gaming PC" : "Test Device", category: kind,
          requirements: `Validate ${kind} end to end`, serviceMethod: "Shop Visit",
          orderNumber: kind === "delivery" ? `E2E-ORDER-${stamp}` : undefined,
          address: kind === "delivery" ? { line1: "E2E test", city: "Bhilai", state: "Chhattisgarh", postalCode: "490023" } : undefined,
          components: kind === "pc-build" ? [{ type: "CPU", name: "Test CPU", price: 1000 }] : undefined,
          total: kind === "pc-build" ? 1000 : undefined,
        },
      }),
    });
    assert.equal(result.status, 201, `${kind}: ${JSON.stringify(result.body)}`);
    created.push(result.body);
    await uploadPhoto(result.body);
  }
  console.log("PASS Test1 created all nine service types");

  for (const record of created) await visible("customer", record);

  const technicians = await api("admin", "/api/services/technicians/list");
  assert.equal(technicians.status, 200);
  const technician = technicians.body.technicians.find(item => item.email === accounts.staff[0]);
  assert.ok(technician?.id, "Seeded Test3 technician missing");

  for (const [index, record] of created.entries()) {
    const quote = await api("admin", `/api/services/${encodeURIComponent(record.serviceNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "quotation", estimatedCost: 1500 + index, technicianId: technician.id,
        deviceInfo: { quotationItems: [{ label: `${record.serviceType} service`, cost: 1500 + index }], quotationNote: "Approved E2E quotation" },
      }),
    });
    assert.equal(quote.status, 200, JSON.stringify(quote.body));
    assert.equal(quote.body.technicianId, technician.id);
    assert.equal(quote.body.attachments.length, 1);
  }
  console.log("PASS Test2 quoted every request and assigned Test3 technician");

  const customerQuoted = await api("customer", "/api/services/my?limit=100");
  const staffAssigned = await api("staff", "/api/services?limit=100");
  for (const [index, record] of created.entries()) {
    const customerRow = customerQuoted.body.services.find(row => row.serviceNumber === record.serviceNumber);
    const staffRow = staffAssigned.body.services.find(row => row.serviceNumber === record.serviceNumber);
    assert.equal(customerRow.estimatedCost, 1500 + index);
    assert.equal(customerRow.technicianId, technician.id);
    assert.equal(customerRow.attachments.length, 1);
    assert.equal(staffRow.technicianId, technician.id);
    await visible("admin", record);
    await visible("staff", record);
  }
  console.log("PASS quotation, photo, and assignment reached all three device sessions");

  for (const record of created) {
    const status = record.serviceType === "sell" ? "accepted" : "approved";
    const approved = await api("customer", `/api/services/${encodeURIComponent(record.serviceNumber)}`, {
      method: "PATCH", body: JSON.stringify({ status, deviceInfo: { customerActionAt: Date.now() } }),
    });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
  }
  console.log("PASS Test1 approved/accepted every quotation with ownership enforcement");

  for (const record of created) {
    const progressing = await api("staff", `/api/services/${encodeURIComponent(record.serviceNumber)}`, {
      method: "PATCH", body: JSON.stringify({ status: "in-progress", deviceInfo: { technicianNotes: "Test3 processing" } }),
    });
    assert.equal(progressing.status, 200);
    const completed = await api("staff", `/api/services/${encodeURIComponent(record.serviceNumber)}`, {
      method: "PATCH", body: JSON.stringify({ status: "delivered", finalCost: progressing.body.estimatedCost }),
    });
    assert.equal(completed.status, 200);
  }
  const customerFinal = await api("customer", "/api/services/my?limit=100");
  for (const record of created) {
    assert.equal(customerFinal.body.services.find(row => row.serviceNumber === record.serviceNumber)?.status, "delivered");
    await visible("customer", record);
  }
  console.log("PASS Test3 completed all requests and Test1 received delivered status");

  for (const record of created) {
    const deleted = await api("admin", `/api/services/${encodeURIComponent(record.serviceNumber)}`, { method: "DELETE" });
    assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  }
  const afterCleanup = await api("admin", "/api/services?limit=100");
  for (const record of created) assert.ok(!afterCleanup.body.services.some(row => row.serviceNumber === record.serviceNumber));
  console.log("PASS cleanup removed temporary database records and attachment objects");
  console.log("RESULT: nine-service three-device production lifecycle passed end to end");
} finally {
  // Best-effort cleanup if an assertion interrupts the run.
  if (pages.admin) {
    for (const record of created) await api("admin", `/api/services/${encodeURIComponent(record.serviceNumber)}`, { method: "DELETE" }).catch(() => null);
  }
  for (const context of Object.values(contexts)) await context.close().catch(() => {});
  await browser.close();
}
