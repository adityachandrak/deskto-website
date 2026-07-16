#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.WEBSITE_URL || 'https://d2tfbpn3o5piw8.cloudfront.net').replace(/\/$/, '');
const password = 'admin123';
const browser = await chromium.launch({ headless: true });
let productId = null;

async function login(context, candidates, role) {
  const page = await context.newPage();
  for (const email of candidates) {
    await page.goto(`${base}/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    try {
      await page.waitForURL(`**/dashboard/${role}`, { timeout: 8_000 });
      console.log(`PASS browser ${role} login as ${email}`);
      return page;
    } catch { /* try next seeded alias */ }
  }
  throw new Error(`Browser ${role} login failed`);
}

async function api(page, path, options = {}) {
  return page.evaluate(async ({ path, options }) => {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('deskto_access_token')}`, ...(options.headers || {}) },
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { path, options });
}

try {
  const adminContext = await browser.newContext();
  const admin = await login(adminContext, ['test2@gmail.com', 'admin@deskto.com'], 'admin');
  const stamp = Date.now();
  const name = `E2E UI Catalog ${stamp}`;
  const draft = await api(admin, '/api/products/admin/upsert', { method: 'POST', body: JSON.stringify({
    sku: `E2E-UI-${stamp}`, name, description: 'Browser publish status validation', price: 45678, category: 'monitor', brand: 'DESKTO',
    stockQuantity: 4, status: 'draft', specifications: { specs: ['UI spec'], features: ['UI feature'] }, tags: ['e2e-ui'],
  }) });
  assert.equal(draft.status, 200, JSON.stringify(draft.body));
  productId = draft.body.id;
  const presign = await api(admin, `/api/products/${productId}/images/upload-url`, { method: 'POST', body: JSON.stringify({ fileName: 'ui.png', contentType: 'image/png' }) });
  assert.equal(presign.status, 200, JSON.stringify(presign.body));
  const uploadStatus = await admin.evaluate(async ({ uploadUrl }) => {
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), c => c.charCodeAt(0));
    return (await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: new Blob([bytes], { type: 'image/png' }) })).status;
  }, { uploadUrl: presign.body.uploadUrl });
  assert.ok(uploadStatus >= 200 && uploadStatus < 300);
  const complete = await api(admin, `/api/products/${productId}/images/complete`, { method: 'POST', body: JSON.stringify({ objectKey: presign.body.objectKey, altText: name, isPrimary: true }) });
  assert.equal(complete.status, 201, JSON.stringify(complete.body));

  await admin.goto(`${base}/dashboard/admin/products`, { waitUntil: 'domcontentloaded' });
  const row = admin.locator('table tbody tr').filter({ hasText: name });
  await row.waitFor({ timeout: 20_000 });
  await row.getByText(/^draft$/i).waitFor();
  console.log('PASS Catalog UI initially renders server status DRAFT');
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await admin.getByRole('button', { name: 'Publish Product', exact: true }).click();
  await admin.getByText('Product published to live catalog', { exact: false }).waitFor({ timeout: 30_000 });
  const publishedRow = admin.locator('table tbody tr').filter({ hasText: name });
  await publishedRow.getByText(/^published$/i).waitFor({ timeout: 20_000 });
  console.log('PASS Catalog UI changes DRAFT -> PUBLISHED after the actual Publish Product click');

  await admin.goto(`${base}/dashboard/admin/builder`, { waitUntil: 'domcontentloaded' });
  await admin.getByRole('button', { name: /Save Draft/ }).click();
  await admin.getByText('Draft saved successfully', { exact: false }).waitFor({ timeout: 20_000 });
  await admin.getByRole('button', { name: /Publish Changes/ }).click();
  await admin.getByText('Builder configuration published successfully', { exact: false }).waitFor({ timeout: 20_000 });
  const publicBuilder = await api(admin, '/api/public/custom-builder');
  assert.equal(publicBuilder.status, 200);
  assert.ok(publicBuilder.body?.data && publicBuilder.body?.version >= 2);
  console.log('PASS Custom Builder UI Save Draft -> Publish writes the shared public configuration');

  const customerContext = await browser.newContext();
  const customer = await login(customerContext, ['test1@gmail.com', 'test4@gmail.com'], 'customer');
  const customerBuilder = await api(customer, '/api/public/custom-builder');
  assert.ok(customerBuilder.body?.data);
  await customer.goto(`${base}/services/custom-pc`, { waitUntil: 'domcontentloaded' });
  await customer.getByText(/Custom PC|Build/i).first().waitFor({ timeout: 20_000 });
  console.log('PASS fresh Customer browser reads the published builder and renders Custom PC page');
} finally {
  if (productId) {
    const pages = browser.contexts().flatMap(context => context.pages());
    const admin = pages.find(page => page.url().includes('/dashboard/admin'));
    if (admin) await api(admin, `/api/products/${productId}?hard=true`, { method: 'DELETE' }).catch(() => null);
  }
  await browser.close();
  console.log('CLEANUP attempted for browser E2E product and S3 image');
}
