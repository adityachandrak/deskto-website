const Module = require("module");
const { randomUUID } = require("crypto");
const bcrypt = require("../backend/node_modules/bcryptjs");

const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  customer: "22222222-2222-4222-8222-222222222222",
  staff: "33333333-3333-4333-8333-333333333333",
  product: "44444444-4444-4444-8444-444444444444",
  order: "55555555-5555-4555-8555-555555555555",
  orderItem: "66666666-6666-4666-8666-666666666666",
  service: "77777777-7777-4777-8777-777777777777",
  backup: "88888888-8888-4888-8888-888888888888",
};

const now = new Date().toISOString();

const db = {
  users: [
    {
      id: ids.admin,
      email: "admin@deskto.com",
      phone: "+919876543210",
      password_hash: bcrypt.hashSync("admin123", 10),
      first_name: "Admin",
      last_name: "User",
      role: "admin",
      status: "active",
      created_at: now,
    },
    {
      id: ids.customer,
      email: "demo@deskto.in",
      phone: "+919876543215",
      password_hash: bcrypt.hashSync("admin123", 10),
      first_name: "Demo",
      last_name: "Customer",
      role: "customer",
      status: "active",
      created_at: now,
    },
  ],
  refresh_tokens: [],
  gamingHub: [],
  products: [
    {
      id: ids.product,
      sku: "GPU-001",
      name: "DESKTO Phantom X",
      slug: "deskto-phantom-x",
      description: "Gaming desktop",
      price: "285000.00",
      compare_price: "299000.00",
      category: "Gaming PC",
      brand: "DESKTO",
      stock_quantity: 5,
      image_url: null,
      images: [],
      specifications: {},
      tags: [],
      market_tag: "Flagship",
      is_active: true,
      is_featured: true,
      weight: null,
      dimensions: {},
      average_rating: "4.8",
      review_count: "12",
      created_at: now,
      updated_at: now,
    },
  ],
  orders: [
    {
      id: ids.order,
      order_number: "ORD-001",
      user_id: ids.customer,
      status: "placed",
      subtotal: "285000.00",
      tax_amount: "51300.00",
      shipping_amount: "0.00",
      discount_amount: "0.00",
      total_amount: "336300.00",
      payment_status: "paid",
      payment_method: "upi",
      shipping_address: { line1: "12 Park Avenue", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
      billing_address: null,
      notes: null,
      created_at: now,
      updated_at: now,
    },
  ],
  order_items: [
    {
      id: ids.orderItem,
      order_id: ids.order,
      product_id: ids.product,
      quantity: 1,
      unit_price: "285000.00",
      total_price: "285000.00",
      specifications: {},
      product_name: "DESKTO Phantom X",
      product_image: null,
    },
  ],
  services: [
    {
      id: ids.service,
      service_number: "SRV-001",
      user_id: ids.customer,
      service_type: "repair",
      status: "submitted",
      title: "Thermal check",
      description: "Runs hot",
      device_info: { device: "Desktop" },
      estimated_cost: "1499.00",
      final_cost: null,
      technician_id: ids.staff,
      created_at: now,
      updated_at: now,
    },
  ],
  staff_profiles: [],
  categories: [],
  brands: [],
  pc_builds: [],
  reviews: [],
  wishlists: [],
  audit_logs: [],
  backup_records: [
    {
      id: ids.backup,
      backup_name: "seed-backup.json",
      backup_type: "full",
      file_size: 1024,
      file_url: "/api/backup/export",
      status: "completed",
      created_at: now,
    },
  ],
};

const tableColumns = Object.fromEntries(Object.entries(db).map(([table, rows]) => [table, Object.keys(rows[0] || { id: "" })]));

function rows(value = []) {
  return Promise.resolve({ rows: value });
}

function count(value) {
  return rows([{ count: String(value) }]);
}

function newUuid(prefix = "99999999") {
  return `${prefix}-${Date.now().toString().slice(-4)}-4999-8999-${Math.random().toString().slice(2, 14).padEnd(12, "0")}`;
}

async function mockQuery(text, params = []) {
  const sql = String(text).replace(/\s+/g, " ").trim().toLowerCase();

  if (sql === "begin" || sql === "commit" || sql === "rollback" || sql.startsWith("truncate ")) return rows([]);

  if (sql.includes("information_schema.columns")) {
    return rows((tableColumns[params[0]] || ["id"]).map(column_name => ({ column_name })));
  }

  if (sql.startsWith("select * from ")) {
    const match = sql.match(/select \* from "?([a-z_]+)"?/);
    const table = match && match[1];
    // Defer gaming_hub to its dedicated branch below so we can apply WHERE filters.
    if (table && table !== "gaming_hub") {
      return rows(match ? [...(db[match[1]] || [])] : []);
    }
  }

  // ── Homepage CMS / gaming_hub ───────────────────────────────────────────
  // Defer gaming_hub SELECT to its dedicated branch below so we can apply
  // WHERE filters (status, content_type). The generic `select * from `
  // matcher above skips gaming_hub for that reason.
  if (sql.startsWith("select 1 from gaming_hub where slug")) {
    const [slug, excludeId] = params;
    const conflict = db.gamingHub.find((g) => g.slug === slug && (!excludeId || g.id !== excludeId));
    return rows(conflict ? [{ "?column?": 1 }] : []);
  }
  if (sql.startsWith("insert into gaming_hub")) {
    // INSERT INTO gaming_hub (<cols>) VALUES (<placeholders>) RETURNING *
    const colsMatch = sql.match(/insert into gaming_hub \(([^)]+)\)/i);
    if (!colsMatch) throw new Error("Cannot parse gaming_hub INSERT columns");
    const cols = colsMatch[1].split(",").map((c) => c.trim());
    const row = {};
    cols.forEach((c, idx) => { row[c] = params[idx]; });
    row.id = row.id || randomUUID();
    row.created_at = row.created_at || now;
    row.updated_at = now;
    db.gamingHub.push(row);
    return rows([row]);
  }
  if (sql.startsWith("update gaming_hub set status = 'published'") || sql.startsWith("update gaming_hub set status = 'archived'")) {
    const id = params[params.length - 1];
    const row = db.gamingHub.find((g) => g.id === id);
    if (!row) return rows([]);
    const isPublish = sql.includes("'published'");
    row.status = isPublish ? "published" : "archived";
    if (isPublish) row.publish_date = row.publish_date || now;
    row.updated_at = now;
    return rows([row]);
  }
  if (sql.startsWith("update gaming_hub set")) {
    // Generic update — last param is the WHERE id = $N
    const id = params[params.length - 1];
    const row = db.gamingHub.find((g) => g.id === id);
    if (!row) return rows([]);
    // Match the SET clause up to `WHERE` (case-insensitive, multiline-safe).
    const setClause = (sql.match(/\bset\s+(.+?)\s+where\b/is) || [])[1] || "";
    const assigns = setClause
      .split(/,(?![^()]*\))/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("updated_at"));
    assigns.forEach((assignment) => {
      const m = assignment.match(/^([a-z_]+)\s*=\s*\$(\d+)\s*$/i);
      if (m) {
        const [, col, idx] = m;
        row[col] = params[Number(idx) - 1];
      }
    });
    row.updated_at = now;
    return rows([row]);
  }
  if (sql.startsWith("delete from gaming_hub where id")) {
    const id = params[0];
    const idx = db.gamingHub.findIndex((g) => g.id === id);
    if (idx >= 0) db.gamingHub.splice(idx, 1);
    return rows([]);
  }
  if (sql.startsWith("select * from gaming_hub")) {
    let result = db.gamingHub.slice();
    const lower = sql.toLowerCase();
    if (lower.includes("where status = $1")) {
      const status = params[0];
      result = result.filter((g) => g.status === status);
      if (lower.includes("and content_type = $2")) {
        const type = params[1];
        result = result.filter((g) => g.content_type === type);
      }
    }
    if (lower.includes("where slug = $1 and status = $2")) {
      const [slug, status] = params;
      result = result.filter((g) => g.slug === slug && g.status === status);
    }
    if (lower.includes("where id = $1")) {
      result = result.filter((g) => g.id === params[0]);
    }
    return rows(result);
  }

  if (sql.includes("select id from users where email")) {
    return rows(db.users.filter(user => user.email === params[0]).map(user => ({ id: user.id })));
  }

  if (sql.startsWith("insert into users")) {
    const user = {
      id: newUuid("aaaaaaa1"),
      email: params[0],
      phone: params[1],
      password_hash: params[2],
      first_name: params[3],
      last_name: params[4],
      role: sql.includes("'staff'") ? "staff" : sql.includes("'admin'") ? "admin" : "customer",
      status: "active",
      created_at: now,
    };
    db.users.push(user);
    return rows([user]);
  }

  if (sql.startsWith("select id, email, password_hash")) {
    return rows(db.users.filter(user => user.email === params[0] || user.phone === params[0]));
  }

  if (sql.includes("from users where id = $1") && sql.includes("status = $2")) {
    return rows(db.users.filter(user => user.id === params[0] && user.status === params[1]).map(user => ({ id: user.id, email: user.email, role: user.role })));
  }

  if (sql.includes("from users where id = $1")) {
    return rows(db.users.filter(user => user.id === params[0]));
  }

  if (sql.startsWith("insert into refresh_tokens")) {
    db.refresh_tokens.push({ user_id: params[0], token: params[1], expires_at: params[2], revoked: false });
    return rows([]);
  }

  if (sql.includes("from refresh_tokens where token")) {
    return rows(db.refresh_tokens.filter(token => token.token === params[0] && token.user_id === params[1] && !token.revoked));
  }

  if (sql.startsWith("update refresh_tokens set revoked")) {
    db.refresh_tokens.forEach(token => {
      if (token.token === params[0] && token.user_id === params[1]) token.revoked = true;
    });
    return rows([]);
  }

  if (sql.includes("select id, sku, name, slug") && sql.includes("from products")) {
    return rows(db.products.filter(product => product.is_active));
  }

  if (sql.startsWith("select count(*) from products")) return count(db.products.filter(product => product.is_active).length);

  if (sql.includes("from products p") && sql.includes("where p.slug")) {
    return rows(db.products.filter(product => product.slug === params[0] && product.is_active));
  }

  if (sql.startsWith("insert into products")) {
    const product = {
      id: newUuid("bbbbbbb2"),
      sku: params[0],
      name: params[1],
      slug: params[2],
      description: params[3],
      price: String(params[4]),
      compare_price: params[5] ? String(params[5]) : null,
      category: params[6],
      brand: params[7],
      stock_quantity: params[8],
      image_url: params[9],
      specifications: params[10] || {},
      tags: params[11] || [],
      market_tag: params[12],
      is_featured: params[13] || false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.products.push(product);
    return rows([product]);
  }

  if (sql.startsWith("update products set stock_quantity = stock_quantity -")) {
    const product = db.products.find(item => item.id === params[1]);
    if (product) product.stock_quantity -= params[0];
    return rows([]);
  }

  if (sql.startsWith("update products set is_active = false")) {
    const product = db.products.find(item => item.id === params[0]);
    if (product) product.is_active = false;
    return rows([]);
  }

  if (sql.startsWith("update products set") && sql.includes("returning *")) {
    const product = db.products.find(item => item.id === params[params.length - 1]) || db.products[0];
    if (product) {
      product.name = params[0] || product.name;
      product.updated_at = now;
    }
    return rows(product ? [product] : []);
  }

  if (sql.includes("from orders") && sql.includes("where user_id = $1") && !sql.startsWith("select count")) {
    return rows(db.orders.filter(order => order.user_id === params[0]));
  }

  if (sql.startsWith("select count(*) from orders")) return count(db.orders.filter(order => order.user_id === params[0]).length);

  if (sql.startsWith("select * from orders where order_number")) {
    return rows(db.orders.filter(order => order.order_number === params[0] && order.user_id === params[1]));
  }

  if (sql.includes("from order_items oi")) {
    return rows(db.order_items.filter(item => item.order_id === params[0]).map(item => ({
      ...item,
      product_name: db.products.find(product => product.id === item.product_id)?.name || item.product_name,
      product_image: null,
    })));
  }

  if (sql.startsWith("select id, price, stock_quantity from products")) {
    return rows(db.products.filter(product => product.id === params[0] && product.is_active));
  }

  if (sql.startsWith("select id, name, price from products")) {
    return rows(db.products.filter(product => product.id === params[0]));
  }

  if (sql.startsWith("insert into orders")) {
    const order = {
      id: newUuid("ccccccc3"),
      order_number: params[0],
      user_id: params[1],
      status: "placed",
      subtotal: String(params[2]),
      tax_amount: String(params[3]),
      shipping_amount: String(params[4]),
      total_amount: String(params[5]),
      shipping_address: params[6],
      billing_address: params[7],
      notes: params[8],
      payment_status: "pending",
      created_at: now,
      updated_at: now,
    };
    db.orders.push(order);
    return rows([order]);
  }

  if (sql.startsWith("insert into order_items")) {
    db.order_items.push({ id: newUuid("ddddddd4"), order_id: params[0], product_id: params[1], quantity: params[2], unit_price: params[3], total_price: params[4] });
    return rows([]);
  }

  if (sql.startsWith("update orders set status")) {
    const order = db.orders.find(item => item.id === params[1]);
    if (order) {
      order.status = params[0];
      order.updated_at = now;
    }
    return rows(order ? [order] : []);
  }

  if (sql.includes("from services") && sql.includes("where user_id = $1") && !sql.startsWith("select count")) {
    return rows(db.services.filter(service => service.user_id === params[0]));
  }

  if (sql.startsWith("select count(*) from services")) return count(db.services.filter(service => service.user_id === params[0]).length);

  if (sql.startsWith("select * from services where service_number")) {
    const serviceNumber = params[0];
    const userId = params[1];
    return rows(db.services.filter(service => service.service_number === serviceNumber && (!userId || service.user_id === userId)));
  }

  if (sql.startsWith("insert into services")) {
    const service = {
      id: newUuid("eeeeeee5"),
      service_number: params[0],
      user_id: params[1],
      service_type: params[2],
      status: "submitted",
      title: params[3],
      description: params[4],
      device_info: params[5],
      estimated_cost: null,
      final_cost: null,
      created_at: now,
      updated_at: now,
    };
    db.services.push(service);
    return rows([service]);
  }

  if (sql.startsWith("update services set")) {
    const service = db.services.find(item => item.id === params[params.length - 1]);
    if (service) {
      service.status = params[0];
      service.updated_at = now;
      if (params.length > 2) service.estimated_cost = params[1] || service.estimated_cost;
    }
    return rows(service ? [service] : []);
  }

  if (sql.includes("from backup_records")) return rows(db.backup_records);

  if (sql.startsWith("insert into backup_records")) {
    db.backup_records.push({
      id: newUuid("fffffff6"),
      backup_name: params[0],
      backup_type: "full",
      file_size: params[1] || null,
      file_url: params[2] || null,
      status: "completed",
      created_at: now,
    });
    return rows([]);
  }

  if (sql.startsWith("insert into staff_profiles")) return rows([]);
  if (sql.startsWith("insert into categories")) return rows([]);
  if (sql.startsWith("insert into brands")) return rows([]);
  if (sql.startsWith("insert into pc_builds")) return rows([]);

  throw new Error(`Unmocked query: ${text}`);
}

class MockPool {
  on() {}
  query(text, params) {
    return mockQuery(text, params);
  }
  connect() {
    return Promise.resolve({
      query: mockQuery,
      release() {},
    });
  }
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "pg") {
    return { Pool: MockPool };
  }
  return originalLoad.call(this, request, parent, isMain);
};

process.env.JWT_SECRET = "backend-validation-secret-min-32-chars";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";

const app = require("../backend/dist/index").default;

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

function assertStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${result.status} ${JSON.stringify(result.data)}`);
  }
}

async function run() {
  const server = await listen(app);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const results = [];

  async function step(group, label, fn) {
    try {
      await fn();
      results.push({ group, label, ok: true });
      console.log(`PASS ${group} - ${label}`);
    } catch (error) {
      results.push({ group, label, ok: false, error: error.message });
      console.log(`FAIL ${group} - ${label}: ${error.message}`);
    }
  }

  let adminToken = "";
  let adminRefresh = "";
  let customerToken = "";
  let customerRefresh = "";
  let newProductId = ids.product;
  let newOrderId = ids.order;
  let newServiceId = ids.service;

  await step("Auth", "register customer", async () => {
    const result = await request(baseUrl, "POST", "/api/auth/register", {
      body: { email: "new.customer@deskto.in", password: "Strong@1234", firstName: "New", lastName: "Customer", phone: "+919999999999" },
    });
    assertStatus(result, 201, "register");
    customerToken = result.data.accessToken;
    customerRefresh = result.data.refreshToken;
  });

  await step("Auth", "login admin", async () => {
    const result = await request(baseUrl, "POST", "/api/auth/login", { body: { identifier: "admin@deskto.com", password: "admin123" } });
    assertStatus(result, 200, "admin login");
    adminToken = result.data.accessToken;
    adminRefresh = result.data.refreshToken;
  });

  await step("Auth", "current user", async () => {
    const result = await request(baseUrl, "GET", "/api/auth/me", { token: adminToken });
    assertStatus(result, 200, "me");
  });

  await step("Auth", "refresh token", async () => {
    const result = await request(baseUrl, "POST", "/api/auth/refresh", { body: { refreshToken: adminRefresh } });
    assertStatus(result, 200, "refresh");
  });

  await step("Auth", "logout", async () => {
    const result = await request(baseUrl, "POST", "/api/auth/logout", { token: adminToken, body: { refreshToken: adminRefresh } });
    assertStatus(result, 200, "logout");
  });

  await step("Products", "list products", async () => {
    const result = await request(baseUrl, "GET", "/api/products");
    assertStatus(result, 200, "products list");
    if (!Array.isArray(result.data.products)) throw new Error("products list missing array");
  });

  await step("Products", "get product by slug", async () => {
    const result = await request(baseUrl, "GET", "/api/products/deskto-phantom-x");
    assertStatus(result, 200, "product slug");
  });

  await step("Products", "create product as admin", async () => {
    const result = await request(baseUrl, "POST", "/api/products", {
      token: adminToken,
      body: { sku: "CPU-001", name: "Validation Workstation", price: 79999, category: "Desktop PC", brand: "DESKTO", stockQuantity: 3 },
    });
    assertStatus(result, 201, "product create");
    newProductId = result.data.id;
  });

  await step("Products", "update product as admin", async () => {
    const result = await request(baseUrl, "PUT", `/api/products/${newProductId}`, { token: adminToken, body: { name: "Validation Workstation Pro" } });
    assertStatus(result, 200, "product update");
  });

  await step("Products", "delete product as admin", async () => {
    const result = await request(baseUrl, "DELETE", `/api/products/${newProductId}`, { token: adminToken });
    assertStatus(result, 200, "product delete");
  });

  await step("Orders", "list my orders", async () => {
    const result = await request(baseUrl, "GET", "/api/orders/my", { token: customerToken });
    assertStatus(result, 200, "orders my");
  });

  await step("Orders", "get order by number", async () => {
    const result = await request(baseUrl, "GET", "/api/orders/ORD-001", { token: customerToken });
    assertStatus(result, 200, "order detail");
  });

  await step("Orders", "create order", async () => {
    const result = await request(baseUrl, "POST", "/api/orders", {
      token: customerToken,
      body: {
        items: [{ productId: ids.product, quantity: 1 }],
        shippingAddress: { line1: "12 Park Avenue", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
      },
    });
    assertStatus(result, 201, "order create");
    newOrderId = result.data.id;
  });

  await step("Orders", "update order status as admin", async () => {
    const result = await request(baseUrl, "PATCH", `/api/orders/${newOrderId}/status`, { token: adminToken, body: { status: "verified" } });
    assertStatus(result, 200, "order status");
  });

  await step("Services", "list my services", async () => {
    const result = await request(baseUrl, "GET", "/api/services/my", { token: customerToken });
    assertStatus(result, 200, "services my");
  });

  await step("Services", "get service by number", async () => {
    const result = await request(baseUrl, "GET", "/api/services/SRV-001", { token: customerToken });
    assertStatus(result, 200, "service detail");
  });

  await step("Services", "create service request", async () => {
    const result = await request(baseUrl, "POST", "/api/services", {
      token: customerToken,
      body: { serviceType: "repair", title: "Validation repair", description: "Validate backend service route", deviceInfo: { device: "PC" } },
    });
    assertStatus(result, 201, "service create");
    newServiceId = result.data.id;
  });

  await step("Services", "update service status as admin", async () => {
    const result = await request(baseUrl, "PATCH", `/api/services/${newServiceId}/status`, { token: adminToken, body: { status: "diagnosing", estimatedCost: 1499 } });
    assertStatus(result, 200, "service status");
  });

  await step("Backup", "list backup records", async () => {
    const result = await request(baseUrl, "GET", "/api/backup-records", { token: adminToken });
    assertStatus(result, 200, "backup records");
  });

  await step("Backup", "export backup", async () => {
    const result = await request(baseUrl, "GET", "/api/backup/export", { token: adminToken });
    assertStatus(result, 200, "backup export");
    if (!result.data.tables) throw new Error("export missing tables");
  });

  await step("Backup", "restore backup", async () => {
    const result = await request(baseUrl, "POST", "/api/backup/restore", {
      token: adminToken,
      body: { version: 1, tables: { users: [], staff_profiles: [], categories: [], brands: [], products: [], orders: [], order_items: [], services: [], pc_builds: [], reviews: [], wishlists: [], refresh_tokens: [], audit_logs: [] } },
    });
    assertStatus(result, 200, "backup restore");
  });

  await step("Backup", "reset demo", async () => {
    const result = await request(baseUrl, "POST", "/api/backup/reset-demo", { token: adminToken });
    assertStatus(result, 200, "backup reset demo");
  });

  // ── Homepage CMS (Phase 7) ────────────────────────────────────────────
  let cmsDraftId = "";
  let cmsPublishId = "";

  await step("HomepageCMS", "admin can create a draft FAQ", async () => {
    const result = await request(baseUrl, "POST", "/api/admin/homepage-content", {
      token: adminToken,
      body: {
        type: "faq",
        title: `CMS test FAQ ${Date.now()}`,
        shortDescription: "draft short description",
        body: "draft answer body",
        status: "draft",
      },
    });
    assertStatus(result, 201, "create draft");
    if (!result.data.id) throw new Error("create response missing id");
    cmsDraftId = result.data.id;
    if (result.data.status !== "draft") throw new Error(`expected status=draft, got ${result.data.status}`);
  });

  await step("HomepageCMS", "draft is hidden from public list", async () => {
    const result = await request(baseUrl, "GET", "/api/public/homepage-content?type=faq");
    assertStatus(result, 200, "public list");
    const found = (result.data || []).find((it) => it.id === cmsDraftId);
    if (found) throw new Error("draft was returned by public API");
  });

  await step("HomepageCMS", "admin can publish the draft", async () => {
    const result = await request(baseUrl, "PATCH", `/api/admin/homepage-content/${cmsDraftId}/publish`, { token: adminToken });
    assertStatus(result, 200, "publish");
    if (result.data.status !== "published") throw new Error(`expected status=published, got ${result.data.status}`);
  });

  await step("HomepageCMS", "published FAQ is now visible publicly", async () => {
    const result = await request(baseUrl, "GET", "/api/public/homepage-content?type=faq");
    assertStatus(result, 200, "public list");
    const found = (result.data || []).find((it) => it.id === cmsDraftId);
    if (!found) throw new Error("published record not returned by public API");
    cmsPublishId = cmsDraftId;
  });

  await step("HomepageCMS", "admin can edit a published record", async () => {
    const result = await request(baseUrl, "PUT", `/api/admin/homepage-content/${cmsPublishId}`, {
      token: adminToken,
      body: { title: "CMS EDITED FAQ" },
    });
    assertStatus(result, 200, "update");
    if (result.data.title !== "CMS EDITED FAQ") throw new Error(`expected updated title, got ${result.data.title}`);
  });

  await step("HomepageCMS", "edited title is visible publicly", async () => {
    const result = await request(baseUrl, "GET", "/api/public/homepage-content?type=faq");
    assertStatus(result, 200, "public list");
    const found = (result.data || []).find((it) => it.id === cmsPublishId);
    if (!found || found.title !== "CMS EDITED FAQ") throw new Error("edited title not visible publicly");
  });

  await step("HomepageCMS", "non-admin cannot create content", async () => {
    const result = await request(baseUrl, "POST", "/api/admin/homepage-content", {
      token: customerToken,
      body: { type: "faq", title: "customer attempt" },
    });
    assertStatus(result, 403, "non-admin POST");
  });

  await step("HomepageCMS", "unauthenticated request is rejected", async () => {
    const result = await request(baseUrl, "POST", "/api/admin/homepage-content", {
      body: { type: "faq", title: "anon attempt" },
    });
    assertStatus(result, 401, "anon POST");
  });

  await step("HomepageCMS", "invalid content_type is rejected", async () => {
    const result = await request(baseUrl, "POST", "/api/admin/homepage-content", {
      token: adminToken,
      body: { type: "not-a-type", title: "bad" },
    });
    assertStatus(result, 400, "invalid content_type");
  });

  await step("HomepageCMS", "public response sets no-store cache header", async () => {
    const result = await request(baseUrl, "GET", "/api/public/homepage-content");
    const cacheControl = String(
      (result.headers && typeof result.headers.get === "function"
        ? result.headers.get("cache-control")
        : (result.headers && (result.headers["cache-control"] || result.headers["Cache-Control"]))) || ""
    );
    if (!/no-store|max-age=0/i.test(cacheControl)) {
      throw new Error(`cache-control header missing or wrong: "${cacheControl}"`);
    }
  });

  await step("HomepageCMS", "admin can unpublish", async () => {
    const result = await request(baseUrl, "PATCH", `/api/admin/homepage-content/${cmsPublishId}/unpublish`, { token: adminToken });
    assertStatus(result, 200, "unpublish");
  });

  await step("HomepageCMS", "unpublished record is hidden publicly", async () => {
    const result = await request(baseUrl, "GET", "/api/public/homepage-content?type=faq");
    assertStatus(result, 200, "public list");
    const found = (result.data || []).find((it) => it.id === cmsPublishId);
    if (found) throw new Error("unpublished record still returned by public API");
  });

  await step("HomepageCMS", "admin can delete", async () => {
    const result = await request(baseUrl, "DELETE", `/api/admin/homepage-content/${cmsPublishId}`, { token: adminToken });
    assertStatus(result, 200, "delete");
  });

  await step("HomepageCMS", "deleted record is gone permanently", async () => {
    const result = await request(baseUrl, "GET", "/api/admin/homepage-content", { token: adminToken });
    assertStatus(result, 200, "admin list");
    const found = (result.data || []).find((it) => it.id === cmsPublishId);
    if (found) throw new Error("deleted record still in admin list");
  });

  server.close();

  const failed = results.filter(result => !result.ok);
  const groups = [...new Set(results.map(result => result.group))];
  console.log("\nBackend workflow validation summary");
  console.log(`Groups checked: ${groups.length}`);
  console.log(`Steps checked: ${results.length}`);
  console.log(`Passed: ${results.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length) {
    console.log(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
