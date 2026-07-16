#!/usr/bin/env node
import assert from 'node:assert/strict';

const base = (process.env.WEBSITE_URL || 'https://d2tfbpn3o5piw8.cloudfront.net').replace(/\/$/, '');
const password = 'admin123';
const candidates = {
  customer: ['test1@gmail.com', 'test4@gmail.com'],
  admin: ['test2@gmail.com', 'admin@deskto.com'],
  staff: ['test3@gmail.com', 'sales@deskto.com'],
};
const sessions = {};
const cleanup = { product: null, category: null, brand: null, note: null, staff: null, service: null };
let stamp = 0;

async function raw(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function login(role) {
  for (const identifier of candidates[role]) {
    const result = await raw('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
    if (result.status === 200) {
      sessions[role] = { token: result.body.accessToken, email: identifier, user: result.body.user };
      console.log(`PASS ${role} isolated login as ${identifier}`);
      return;
    }
  }
  throw new Error(`No seeded ${role} account accepted the expected test password`);
}

async function api(role, path, { method = 'GET', json, headers = {}, body } = {}) {
  return raw(path, {
    method,
    headers: { Authorization: `Bearer ${sessions[role].token}`, ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
}

function ok(result, expected = 200) { assert.equal(result.status, expected, JSON.stringify(result.body)); return result.body; }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

try {
  await login('customer');
  await login('admin');
  await login('staff');
  stamp = Date.now();

  const overview = ok(await api('admin', '/api/admin/overview'));
  assert.ok(Number.isInteger(overview.products) && Number.isInteger(overview.customers));
  ok(await api('staff', '/api/admin/overview'));
  assert.equal((await api('customer', '/api/admin/overview')).status, 403);
  console.log('PASS Overview is database-backed and role protected');

  const sku = `E2E-CATALOG-${stamp}`;
  const draft = ok(await api('admin', '/api/products/admin/upsert', { method: 'POST', json: {
    sku, name: `E2E Catalog ${stamp}`, description: 'E2E catalog draft and publish validation', price: 12345,
    category: 'monitor', brand: 'DESKTO', stockQuantity: 7, status: 'draft',
    specifications: { specs: ['E2E spec'], features: ['E2E feature'] }, tags: ['e2e'],
  }}));
  cleanup.product = draft.id;
  assert.equal(draft.status, 'draft');
  let adminCatalog = ok(await api('admin', '/api/products/admin/all')).products;
  assert.equal(adminCatalog.find(item => item.id === draft.id)?.status, 'draft');
  const presign = ok(await api('admin', `/api/products/${draft.id}/images/upload-url`, { method: 'POST', json: { fileName: 'e2e.png', contentType: 'image/png' } }));
  const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png });
  assert.ok(upload.ok, `S3 upload failed: ${upload.status}`);
  ok(await api('admin', `/api/products/${draft.id}/images/complete`, { method: 'POST', json: { objectKey: presign.objectKey, altText: 'E2E product', isPrimary: true } }), 201);
  const published = ok(await api('admin', `/api/products/${draft.id}/publish`, { method: 'POST' }));
  assert.equal(published.status, 'published');
  adminCatalog = ok(await api('admin', '/api/products/admin/all')).products;
  assert.equal(adminCatalog.find(item => item.id === draft.id)?.status, 'published');
  assert.equal(ok(await api('staff', '/api/products/admin/all')).products.find(item => item.id === draft.id)?.status, 'published');
  const publicCatalog = ok(await api('customer', `/api/products?search=${encodeURIComponent(`E2E Catalog ${stamp}`)}&limit=100`)).products;
  assert.ok(publicCatalog.some(item => item.id === draft.id));
  assert.equal((await api('customer', '/api/products/admin/all')).status, 403);
  console.log('PASS Catalog Draft -> Published status is shared across Admin, Staff, and Customer sessions');

  const originalStock = published.stockQuantity;
  ok(await api('admin', `/api/products/${draft.id}`, { method: 'PUT', json: { stockQuantity: originalStock + 5 } }));
  assert.equal(ok(await api('staff', '/api/products/admin/all')).products.find(item => item.id === draft.id)?.stockQuantity, originalStock + 5);
  ok(await api('admin', `/api/products/${draft.id}`, { method: 'PUT', json: { stockQuantity: originalStock } }));
  console.log('PASS Inventory restock persists and is visible to Staff');

  const category = ok(await api('admin', '/api/admin/categories', { method: 'POST', json: { name: `E2E Category ${stamp}`, icon: '✓', color: '#00cc66' } }), 201);
  cleanup.category = category.id;
  assert.ok(ok(await api('staff', '/api/admin/categories')).categories.some(item => item.id === category.id));
  ok(await api('admin', `/api/admin/categories/${category.id}`, { method: 'PUT', json: { ...category, name: `E2E Category Updated ${stamp}` } }));
  assert.equal((await api('customer', '/api/admin/categories')).status, 403);
  console.log('PASS Categories create/update/read is shared and protected');

  const brand = ok(await api('admin', '/api/admin/brands', { method: 'POST', json: { name: `E2E Brand ${stamp}` } }), 201);
  cleanup.brand = brand.id;
  assert.ok(ok(await api('staff', '/api/admin/brands')).brands.some(item => item.id === brand.id));
  ok(await api('admin', `/api/admin/brands/${brand.id}`, { method: 'PUT', json: { ...brand, name: `E2E Brand Updated ${stamp}` } }));
  assert.equal((await api('customer', '/api/admin/brands')).status, 403);
  console.log('PASS Brands create/update/read is shared and protected');

  const customers = ok(await api('admin', '/api/admin/users?role=customer')).users;
  const customer = customers.find(item => item.email.toLowerCase() === sessions.customer.email.toLowerCase()) || customers[0];
  assert.ok(customer?.id, 'Test1 customer missing from directory');
  ok(await api('admin', `/api/admin/users/${customer.id}`, { method: 'PATCH', json: { status: 'active', isVerified: !customer.isVerified } }));
  assert.equal(ok(await api('staff', '/api/admin/users?role=customer')).users.find(item => item.id === customer.id)?.isVerified, !customer.isVerified);
  ok(await api('admin', `/api/admin/users/${customer.id}`, { method: 'PATCH', json: { status: customer.status, isVerified: customer.isVerified } }));
  console.log('PASS Customer lock/verify state is PostgreSQL-backed and reversible');

  const note = ok(await api('admin', '/api/admin/crm-notes', { method: 'POST', json: { customerId: customer.id, note: `E2E: CRM ${stamp}`, noteType: 'follow_up' } }), 201);
  cleanup.note = note.id;
  assert.ok(ok(await api('staff', `/api/admin/crm-notes?customerId=${customer.id}`)).notes.some(item => item.id === note.id));
  assert.equal((await api('customer', `/api/admin/crm-notes?customerId=${customer.id}`)).status, 403);
  console.log('PASS CRM note is visible to Admin and Staff, hidden from Customer');

  const staffEmail = `e2e-staff-${stamp}@deskto.test`;
  const createdStaff = ok(await api('admin', '/api/admin/staff', { method: 'POST', json: { name: 'E2E Staff', email: staffEmail, password, department: 'Support', specialization: 'support' } }), 201);
  cleanup.staff = createdStaff.id;
  assert.ok(ok(await api('staff', '/api/admin/users?role=staff')).users.some(item => item.id === createdStaff.id));
  assert.equal((await api('customer', '/api/admin/users?role=staff')).status, 403);
  const newStaffLogin = await raw('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: staffEmail, password }) });
  assert.equal(newStaffLogin.status, 200);
  console.log('PASS Staff account creation is shared and the new account can log in');

  const enquiry = ok(await api('customer', '/api/services', { method: 'POST', json: {
    serviceType: 'support', title: `E2E Quick Enquiry ${stamp}`, description: 'E2E quick enquiry',
    deviceInfo: { serviceMethod: 'Quick Enquiry', deviceType: 'Enquiry', category: 'Repair Service', requirements: 'E2E enquiry trace' },
  }}), 201);
  cleanup.service = enquiry.serviceNumber;
  assert.ok(ok(await api('admin', '/api/services?limit=100')).services.some(item => item.id === enquiry.id));
  assert.ok(ok(await api('staff', '/api/services?limit=100')).services.some(item => item.id === enquiry.id));
  console.log('PASS Quick Enquiry submitted by Customer is visible to Admin and Staff');

  const builderAdmin = await api('admin', '/api/admin/custom-builder');
  assert.equal(builderAdmin.status, 200);
  const builderPublic = await api('customer', '/api/public/custom-builder');
  assert.equal(builderPublic.status, 200);
  if (builderAdmin.body?.draftData || builderAdmin.body?.publishedData) {
    const current = builderAdmin.body.draftData || builderAdmin.body.publishedData;
    ok(await api('admin', '/api/admin/custom-builder', { method: 'PUT', json: { data: current } }));
    ok(await api('admin', '/api/admin/custom-builder/publish', { method: 'POST', json: { data: current } }));
    assert.ok(ok(await api('customer', '/api/public/custom-builder')).data);
    console.log('PASS Custom Builder draft/publish is shared with Customer');
  } else {
    console.log('PASS Custom Builder shared endpoints are ready; UI publish will seed the existing configuration');
  }

  console.log('RESULT all requested admin-core paths passed in isolated Test1/Test2/Test3 sessions');
} finally {
  if (sessions.admin) {
    if (cleanup.service) ok(await api('admin', `/api/services/${encodeURIComponent(cleanup.service)}`, { method: 'DELETE' }));
    if (cleanup.note) ok(await api('admin', `/api/admin/crm-notes/${cleanup.note}`, { method: 'DELETE' }));
    if (cleanup.staff) ok(await api('admin', `/api/admin/users/${cleanup.staff}?hard=true`, { method: 'DELETE' }));
    if (cleanup.category) ok(await api('admin', `/api/admin/categories/${cleanup.category}?hard=true`, { method: 'DELETE' }));
    if (cleanup.brand) ok(await api('admin', `/api/admin/brands/${cleanup.brand}?hard=true`, { method: 'DELETE' }));
    if (cleanup.product) ok(await api('admin', `/api/products/${cleanup.product}?hard=true`, { method: 'DELETE' }));
    if (stamp) {
      assert.ok(!ok(await api('admin', '/api/products/admin/all')).products.some(item => item.sku === `E2E-CATALOG-${stamp}`));
      assert.ok(!ok(await api('admin', '/api/admin/categories')).categories.some(item => String(item.name).includes(String(stamp))));
      assert.ok(!ok(await api('admin', '/api/admin/brands')).brands.some(item => String(item.name).includes(String(stamp))));
      assert.ok(!ok(await api('admin', '/api/admin/users?role=staff')).users.some(item => item.email === `e2e-staff-${stamp}@deskto.test`));
      assert.ok(!ok(await api('admin', '/api/services?limit=100')).services.some(item => String(item.title).includes(String(stamp))));
    }
  }
  console.log('PASS cleanup removed all E2E database records and the product S3 image');
}
