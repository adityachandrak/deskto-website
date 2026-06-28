// ─────────────── Mirror of the unified Product Purchase Workflow ───────────────
// This script re-implements the catalog + checkout logic that lives in src/app/App.tsx
// so the e-commerce flow can be validated end-to-end without a browser.
//
// Scope:
//   - 22 product categories, Gaming + General types, First-hand + Second-hand conditions.
//   - Apply filters (type, condition, category, brand, price, in-stock, warranty).
//   - Sort by 8 strategies (featured, latest, popular, best-selling, price asc/desc, rating, new arrivals).
//   - Cart ops (add, set qty, remove).
//   - Coupon logic (DESKTO10, WELCOME5).
//   - Address validation (name, phone, email, pincode).
//   - Payment methods + order lifecycle (RESERVED → PAID → SHIPPED → DELIVERED).

// ─────────────── Catalog Data (mirror of PRODUCTS in App.tsx) ───────────────
const CATEGORIES = [
  "laptop","desktop-pc","gaming-pc","gaming-laptop","monitor",
  "cpu","gpu","ram","ssd","hdd","nvme","motherboard","psu",
  "cabinet","keyboard","mouse","headset","router","ups",
  "printer","scanner","accessories","others"
];

const PRODUCTS = [
  { id:1,name:"DESKTO Phantom X",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:285000,orig:320000,rating:4.9,reviews:847,badge:"BESTSELLER",inStock:true,warrantyMonths:36,rgb:true,specs:["RTX 4090 24GB","i9-14900K","64GB DDR5","4TB NVMe"],createdAt:20240601,popularity:9800,sales:412 },
  { id:2,name:"DESKTO Titan Pro",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:195000,orig:220000,rating:4.8,reviews:624,badge:"HOT",inStock:true,warrantyMonths:36,rgb:true,specs:["RTX 4080 Super","i7-14700K","32GB DDR5","2TB NVMe"],createdAt:20240815,popularity:8400,sales:380 },
  { id:3,name:"DESKTO Reaper XT",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:135000,orig:155000,rating:4.7,reviews:412,badge:"NEW",inStock:true,warrantyMonths:24,rgb:true,specs:["RTX 4070 Ti","Ryzen 9 7950X","32GB DDR5","2TB NVMe"],createdAt:20260320,popularity:6200,sales:240 },
  { id:4,name:"DESKTO Workstation W1",type:"general",category:"desktop-pc",condition:"first-hand",brand:"DESKTO",price:165000,orig:185000,rating:4.8,reviews:289,badge:"PRO",inStock:true,warrantyMonths:36,rgb:false,specs:["RTX A4000","Xeon W3","128GB ECC","8TB Storage"],createdAt:20240510,popularity:4100,sales:165 },
  { id:5,name:"DESKTO Elite Slim",type:"general",category:"desktop-pc",condition:"first-hand",brand:"DESKTO",price:82000,orig:95000,rating:4.6,reviews:533,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["RTX 4060","i5-14600K","16GB DDR5","1TB NVMe"],createdAt:20241112,popularity:7300,sales:502 },
  { id:6,name:"DESKTO Origin Mini",type:"general",category:"desktop-pc",condition:"second-hand",brand:"DESKTO",price:55000,orig:62000,rating:4.5,reviews:218,badge:"VALUE",inStock:true,warrantyMonths:6,rgb:false,specs:["GTX 1660 Super","i5-12400","16GB DDR4","512GB NVMe"],createdAt:20240115,popularity:2900,sales:198,serial:"DT-OMG-2018-0042",qualityReport:"8/10 — Fully serviced" },
  { id:7,name:"ASUS ROG Strix G16",type:"gaming",category:"gaming-laptop",condition:"first-hand",brand:"ASUS",price:185000,orig:210000,rating:4.7,reviews:321,badge:"HOT",inStock:true,warrantyMonths:24,rgb:true,specs:["RTX 4070","i9-14900HX","32GB DDR5","1TB NVMe","16\" QHD+ 240Hz"],createdAt:20250210,popularity:7100,sales:265 },
  { id:8,name:"Dell XPS 15",type:"general",category:"laptop",condition:"first-hand",brand:"Dell",price:142000,orig:165000,rating:4.6,reviews:412,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["RTX 4050","i7-13700H","32GB DDR5","1TB NVMe","15.6\" OLED"],createdAt:20240922,popularity:5800,sales:340 },
  { id:9,name:"Lenovo Legion Pro 5 (Used)",type:"gaming",category:"gaming-laptop",condition:"second-hand",brand:"Lenovo",price:78000,orig:145000,rating:4.4,reviews:62,badge:"VALUE",inStock:true,warrantyMonths:3,rgb:true,specs:["RTX 3070","Ryzen 7 6800H","16GB DDR5","1TB NVMe","16\" WQXGA 165Hz"],createdAt:20231115,popularity:1900,sales:58,serial:"LN-LGP5-2023-117" },
  { id:10,name:"LG UltraGear 27GP950",type:"gaming",category:"monitor",condition:"first-hand",brand:"LG",price:62000,orig:72000,rating:4.8,reviews:289,badge:"HOT",inStock:true,warrantyMonths:36,rgb:false,specs:["27\" 4K","144Hz","Nano IPS","HDR600","G-SYNC"],createdAt:20241005,popularity:4600,sales:178 },
  { id:11,name:"Intel Core i9-14900K",type:"general",category:"cpu",condition:"first-hand",brand:"Intel",price:54000,orig:60000,rating:4.9,reviews:531,badge:"BESTSELLER",inStock:true,warrantyMonths:36,rgb:false,specs:["24 Cores","6.0GHz Boost","LGA1700"],createdAt:20240312,popularity:9100,sales:620 },
  { id:12,name:"NVIDIA RTX 4080 Super",type:"gaming",category:"gpu",condition:"first-hand",brand:"NVIDIA",price:98000,orig:110000,rating:4.8,reviews:412,badge:"NEW",inStock:true,warrantyMonths:36,rgb:true,specs:["16GB GDDR6X","DLSS 3.5","Ada Lovelace"],createdAt:20260110,popularity:7800,sales:295 },
  { id:13,name:"RTX 3070 (Used)",type:"gaming",category:"gpu",condition:"second-hand",brand:"NVIDIA",price:26000,orig:52000,rating:4.3,reviews:78,badge:"VALUE",inStock:false,warrantyMonths:0,rgb:true,specs:["8GB GDDR6","Stress-tested 24h"],createdAt:20220901,popularity:1400,sales:72,serial:"NV-3070-2022-088" },
  { id:14,name:"Corsair Vengeance 32GB DDR5",type:"general",category:"ram",condition:"first-hand",brand:"Corsair",price:13500,orig:16000,rating:4.7,reviews:189,badge:null,inStock:true,warrantyMonths:60,rgb:true,specs:["DDR5 6000MHz","CL30","RGB"],createdAt:20240704,popularity:3700,sales:410 },
  { id:15,name:"Samsung 990 PRO 2TB NVMe",type:"general",category:"nvme",condition:"first-hand",brand:"Samsung",price:18900,orig:23000,rating:4.9,reviews:712,badge:"HOT",inStock:true,warrantyMonths:60,rgb:false,specs:["2TB","PCIe Gen4","7450MB/s read"],createdAt:20240810,popularity:8900,sales:840 },
  { id:16,name:"ASUS ROG Strix B760-A",type:"general",category:"motherboard",condition:"first-hand",brand:"ASUS",price:22500,orig:26000,rating:4.6,reviews:142,badge:null,inStock:true,warrantyMonths:36,rgb:true,specs:["LGA1700","DDR5","PCIe 5.0","WiFi 6E"],createdAt:20241001,popularity:3100,sales:188 },
  { id:17,name:"Corsair RM850x PSU",type:"general",category:"psu",condition:"first-hand",brand:"Corsair",price:12500,orig:14500,rating:4.8,reviews:264,badge:null,inStock:true,warrantyMonths:120,rgb:false,specs:["850W","80+ Gold","Fully Modular"],createdAt:20240220,popularity:2400,sales:152 },
  { id:18,name:"Lian Li O11 Dynamic EVO",type:"gaming",category:"cabinet",condition:"first-hand",brand:"Lian Li",price:17900,orig:21000,rating:4.7,reviews:198,badge:"NEW",inStock:true,warrantyMonths:24,rgb:false,specs:["Mid Tower","Dual-Chamber","E-ATX"],createdAt:20251118,popularity:5200,sales:230 },
  { id:19,name:"Logitech G Pro X Keyboard",type:"gaming",category:"keyboard",condition:"first-hand",brand:"Logitech",price:9800,orig:12000,rating:4.6,reviews:312,badge:null,inStock:true,warrantyMonths:24,rgb:true,specs:["Mechanical","Hot-swap","RGB"],createdAt:20240630,popularity:4400,sales:298 },
  { id:20,name:"Razer DeathAdder V3",type:"gaming",category:"mouse",condition:"first-hand",brand:"Razer",price:6500,orig:7500,rating:4.7,reviews:421,badge:"HOT",inStock:true,warrantyMonths:24,rgb:true,specs:["30K DPI","Focus Pro","89g"],createdAt:20240719,popularity:5600,sales:380 },
  { id:21,name:"HyperX Cloud III Headset",type:"gaming",category:"headset",condition:"first-hand",brand:"HyperX",price:8900,orig:11000,rating:4.5,reviews:189,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["53mm Drivers","Detachable Mic","120hr Battery"],createdAt:20240825,popularity:3900,sales:267 },
  { id:22,name:"TP-Link Archer AX90 Router",type:"general",category:"router",condition:"first-hand",brand:"TP-Link",price:14500,orig:17500,rating:4.4,reviews:134,badge:null,inStock:true,warrantyMonths:36,rgb:false,specs:["WiFi 6","Tri-Band","8 Streams"],createdAt:20240318,popularity:2700,sales:146 },
  { id:23,name:"APC Back-UPS 1100VA",type:"general",category:"ups",condition:"first-hand",brand:"APC",price:6900,orig:8500,rating:4.3,reviews:96,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["1100VA","660W","6 Outlets"],createdAt:20240408,popularity:1600,sales:88 },
  { id:24,name:"HP LaserJet Pro M404dn",type:"general",category:"printer",condition:"first-hand",brand:"HP",price:21500,orig:26000,rating:4.5,reviews:142,badge:null,inStock:true,warrantyMonths:12,rgb:false,specs:["Monochrome Laser","40ppm","Auto Duplex","Ethernet"],createdAt:20240515,popularity:1300,sales:78 },
  { id:25,name:"Epson Perfection V39 Scanner",type:"general",category:"scanner",condition:"first-hand",brand:"Epson",price:9200,orig:12000,rating:4.2,reviews:64,badge:null,inStock:true,warrantyMonths:12,rgb:false,specs:["4800 DPI","USB Powered","A4 Flatbed"],createdAt:20240622,popularity:980,sales:54 },
  { id:26,name:"WD Elements 2TB HDD",type:"general",category:"hdd",condition:"first-hand",brand:"WD",price:5400,orig:6500,rating:4.4,reviews:212,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["2TB","USB 3.0","Portable"],createdAt:20240214,popularity:2100,sales:156 },
  { id:27,name:"Crucial MX500 1TB SSD",type:"general",category:"ssd",condition:"first-hand",brand:"Crucial",price:7800,orig:9500,rating:4.7,reviews:298,badge:null,inStock:true,warrantyMonths:60,rgb:false,specs:["1TB","SATA 2.5\"","560MB/s"],createdAt:20240328,popularity:3200,sales:210 },
  { id:28,name:"MSI Cyborg 15 (Used)",type:"gaming",category:"gaming-laptop",condition:"second-hand",brand:"MSI",price:62000,orig:110000,rating:4.2,reviews:38,badge:"VALUE",inStock:true,warrantyMonths:3,rgb:true,specs:["RTX 4060","i7-12650H","16GB DDR5","512GB NVMe","15.6\" FHD 144Hz"],createdAt:20230612,popularity:1100,sales:38,serial:"MS-CYB-2023-204" },
  { id:29,name:"Logitech MX Master 3S",type:"general",category:"mouse",condition:"first-hand",brand:"Logitech",price:8500,orig:10500,rating:4.8,reviews:482,badge:"HOT",inStock:true,warrantyMonths:24,rgb:false,specs:["Wireless","8K DPI","Quiet Clicks"],createdAt:20240915,popularity:6700,sales:412 },
  { id:30,name:"USB-C Hub 8-in-1",type:"general",category:"accessories",condition:"first-hand",brand:"Anker",price:2900,orig:3500,rating:4.5,reviews:312,badge:null,inStock:true,warrantyMonths:18,rgb:false,specs:["HDMI 4K","100W PD","SD/TF","3x USB 3.0"],createdAt:20240708,popularity:4100,sales:320 },
  { id:31,name:"Premium Build Service",type:"general",category:"others",condition:"first-hand",brand:"DESKTO",price:4500,orig:null,rating:4.9,reviews:182,badge:"PRO",inStock:true,warrantyMonths:0,rgb:false,specs:["Cable management","Thermal paste application","Stress test 12h"],createdAt:20240101,popularity:5400,sales:188 },
];

// ─────────────── Test Harness ───────────────
const results = [];

function assertStep(name, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, pass, actual: Array.isArray(actual) ? actual.join(", ") : actual, expected });
  if (!pass) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertTrue(name, condition, detail = "") {
  results.push({ name, pass: !!condition, actual: condition ? "OK" : `FAIL ${detail}`, expected: "OK" });
  if (!condition) throw new Error(`${name}: ${detail}`);
}

// ─────────────── Routing ───────────────
function routeCategory(pathname) {
  if (pathname === "/products/gaming") return "gaming";
  if (pathname === "/products/general") return "general";
  if (pathname === "/products") return "all";
  return null;
}
function isCheckoutPath(pathname) { return pathname === "/checkout"; }

// ─────────────── Catalog filters + sort ───────────────
function applyCatalogFilters(products, f) {
  const q = (f.query || "").trim().toLowerCase();
  return products.filter(p => {
    if (f.type !== "all" && p.type !== f.type) return false;
    if (f.condition !== "all" && p.condition !== f.condition) return false;
    if (f.categories && f.categories.size > 0 && !f.categories.has(p.category)) return false;
    if (f.brands && f.brands.size > 0 && !f.brands.has(p.brand)) return false;
    if (f.priceMin !== null && f.priceMin !== undefined && p.price < f.priceMin) return false;
    if (f.priceMax !== null && f.priceMax !== undefined && p.price > f.priceMax) return false;
    if (f.inStockOnly && !p.inStock) return false;
    if (f.warrantyOnly && p.warrantyMonths <= 0) return false;
    if (q && !`${p.name} ${p.brand} ${p.specs.join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function sortCatalog(products, sort) {
  const out = [...products];
  switch (sort) {
    case "price-low": return out.sort((a,b) => a.price - b.price);
    case "price-high": return out.sort((a,b) => b.price - a.price);
    case "rating": return out.sort((a,b) => b.rating - a.rating);
    case "latest":
    case "new-arrivals": return out.sort((a,b) => b.createdAt - a.createdAt);
    case "popular": return out.sort((a,b) => b.popularity - a.popularity);
    case "best-selling": return out.sort((a,b) => b.sales - a.sales);
    default: return out.sort((a,b) => a.id - b.id);
  }
}

// ─────────────── Cart ops ───────────────
function addToCart(cart, productId) {
  return { ...cart, [productId]:(cart[productId] ?? 0) + 1 };
}
function setQty(cart, productId, qty) {
  const next = { ...cart };
  if (qty <= 0) delete next[productId];
  else next[productId] = qty;
  return next;
}
function cartSubtotal(cart) {
  return Object.entries(cart).reduce((sum,[id,qty]) => {
    const p = PRODUCTS.find(item => item.id === Number(id));
    return p ? sum + p.price * qty : sum;
  }, 0);
}
function cartDiscount(subtotal, coupon) {
  if (!coupon) return 0;
  let d = Math.round(subtotal * (coupon.discountPct / 100));
  if (coupon.flatOff) d = Math.max(d, coupon.flatOff);
  return Math.min(d, subtotal);
}
function cartGst(subtotal, discount) {
  return Math.round((subtotal - discount) * 0.18);
}
function cartGrandTotal(cart, coupon, deliveryMethod) {
  const subtotal = cartSubtotal(cart);
  const discount = cartDiscount(subtotal, coupon);
  const gst = cartGst(subtotal, discount);
  const shipping = deliveryMethod === "ship" ? (subtotal > 50000 ? 0 : 499) : 0;
  return subtotal - discount + gst + shipping;
}

// ─────────────── Coupons ───────────────
function applyCoupon(code, subtotal) {
  const c = (code || "").trim().toUpperCase();
  if (c === "DESKTO10") return { code:"DESKTO10", discountPct:10 };
  if (c === "WELCOME5") return subtotal > 50000 ? { code:"WELCOME5", discountPct:0, flatOff:5000, minSubtotal:50000 } : null;
  return null;
}

// ─────────────── Address validation ───────────────
function normalizePhone(value) { return (value || "").replace(/\D/g, ""); }
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim()); }
function validateAddress(a) {
  if (!a.name?.trim() || a.name.trim().length < 2) return "Enter your full name.";
  if (normalizePhone(a.phone).length < 10) return "Enter a valid 10-digit phone.";
  if (!isEmail(a.email)) return "Enter a valid email.";
  if (!a.line1?.trim()) return "Address line 1 is required.";
  if (!a.city?.trim()) return "City is required.";
  if (!a.state?.trim()) return "State is required.";
  if (!/^\d{6}$/.test((a.pincode || "").trim())) return "Pincode must be 6 digits.";
  return null;
}

// ─────────────── Order lifecycle ───────────────
function placeOrder(state) {
  if (Object.keys(state.cart).length === 0) return { ...state, status:"EMPTY_CART" };
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  return { ...state, orderId, status:"RESERVED" };
}
function markPaid(state) { return { ...state, status:"PAID" }; }
function markShipped(state) { return { ...state, status:"SHIPPED" }; }
function markDelivered(state) { return { ...state, status:"DELIVERED" }; }
function cancel(state) { return { ...state, status:"CANCELLED" }; }
function paymentStatus(state) {
  return state.payment?.method === "cod" ? "PENDING" : "PAID";
}

// ─────────────── ROUTING ───────────────
assertStep("Route /products/gaming", routeCategory("/products/gaming"), "gaming");
assertStep("Route /products/general", routeCategory("/products/general"), "general");
assertStep("Route /products (all)", routeCategory("/products"), "all");
assertStep("Route /unknown returns null", routeCategory("/whoami"), null);
assertTrue("Checkout path /checkout is true", isCheckoutPath("/checkout"));
assertTrue("Checkout path /products is false", !isCheckoutPath("/products"));

// ─────────────── CATALOG DATA COVERAGE ───────────────
const uniqueCategories = new Set(PRODUCTS.map(p => p.category));
assertTrue("All 22 categories represented in PRODUCTS", uniqueCategories.size === CATEGORIES.length, `got ${uniqueCategories.size}`);
assertTrue("Both conditions present", PRODUCTS.some(p => p.condition === "first-hand") && PRODUCTS.some(p => p.condition === "second-hand"));
assertTrue("Both types present", PRODUCTS.some(p => p.type === "gaming") && PRODUCTS.some(p => p.type === "general"));
assertTrue("At least one out-of-stock product", PRODUCTS.some(p => !p.inStock));
assertTrue("At least one zero-warranty product", PRODUCTS.some(p => p.warrantyMonths === 0));
assertTrue("Second-hand products have serial numbers", PRODUCTS.filter(p => p.condition === "second-hand").every(p => !!p.serial));

// ─────────────── FILTERS ───────────────
const gamingProducts = applyCatalogFilters(PRODUCTS, { type:"gaming", condition:"all", categories:new Set(), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"" });
const generalProducts = applyCatalogFilters(PRODUCTS, { type:"general", condition:"all", categories:new Set(), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"" });
assertTrue("Gaming filter returns only gaming products", gamingProducts.every(p => p.type === "gaming") && gamingProducts.length > 0);
assertTrue("General filter returns only general products", generalProducts.every(p => p.type === "general") && generalProducts.length > 0);

const usedGpu = applyCatalogFilters(PRODUCTS, { type:"all", condition:"second-hand", categories:new Set(["gpu"]), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"" });
assertStep("Filter second-hand GPU list", usedGpu.map(p => p.id), [13]);

const nvidiaAll = applyCatalogFilters(PRODUCTS, { type:"all", condition:"all", categories:new Set(), brands:new Set(["NVIDIA"]), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"" });
assertStep("Filter NVIDIA brand", nvidiaAll.map(p => p.id), [12,13]);

const inStock = applyCatalogFilters(PRODUCTS, { type:"all", condition:"all", categories:new Set(), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:true, warrantyOnly:false, query:"" });
assertTrue("In-stock filter excludes out-of-stock", !inStock.some(p => !p.inStock));

const warranty = applyCatalogFilters(PRODUCTS, { type:"all", condition:"all", categories:new Set(), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:true, query:"" });
assertTrue("Warranty filter excludes zero-warranty", warranty.every(p => p.warrantyMonths > 0));

const priceRanged = applyCatalogFilters(PRODUCTS, { type:"all", condition:"all", categories:new Set(), brands:new Set(), priceMin:20000, priceMax:100000, inStockOnly:false, warrantyOnly:false, query:"" });
assertTrue("Price range [20000,100000] honours bounds", priceRanged.every(p => p.price >= 20000 && p.price <= 100000) && priceRanged.length > 0);

const searchRTX = applyCatalogFilters(PRODUCTS, { type:"gaming", condition:"all", categories:new Set(), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"4090" });
assertStep("Search '4090' in gaming catalog", searchRTX.map(p => p.id), [1]);

const multi = applyCatalogFilters(PRODUCTS, { type:"all", condition:"all", categories:new Set(["gpu","laptop"]), brands:new Set(), priceMin:null, priceMax:null, inStockOnly:false, warrantyOnly:false, query:"" });
assertTrue("Multi-category filter includes GPU and laptop products", multi.some(p => p.category === "gpu") && multi.some(p => p.category === "laptop") && multi.every(p => p.category === "gpu" || p.category === "laptop"));

// ─────────────── SORT ───────────────
const sortKeys = ["featured","latest","popular","best-selling","price-low","price-high","rating","new-arrivals"];
for (const k of sortKeys) {
  const sorted = sortCatalog([...PRODUCTS], k);
  assertTrue(`Sort ${k} returns all products`, sorted.length === PRODUCTS.length);
}
const priceLow = sortCatalog([...PRODUCTS], "price-low");
const priceHigh = sortCatalog([...PRODUCTS], "price-high");
assertTrue("Price low → high monotonic", priceLow.every((p,i,a) => i === 0 || a[i-1].price <= p.price));
assertTrue("Price high → low monotonic", priceHigh.every((p,i,a) => i === 0 || a[i-1].price >= p.price));
const rating = sortCatalog([...PRODUCTS], "rating");
assertTrue("Rating sort monotonic", rating.every((p,i,a) => i === 0 || a[i-1].rating >= p.rating));
const latest = sortCatalog([...PRODUCTS], "latest");
assertTrue("Latest sort by createdAt desc", latest[0].createdAt >= latest[latest.length-1].createdAt);
const popular = sortCatalog([...PRODUCTS], "popular");
assertStep("Popular sort top-3 ids", popular.slice(0,3).map(p => p.id), [1,11,15]);
const bestSelling = sortCatalog([...PRODUCTS], "best-selling");
assertStep("Best-selling top-1 id", bestSelling[0].id, 15);
const newArrivals = sortCatalog([...PRODUCTS], "new-arrivals");
assertTrue("New arrivals matches latest order", JSON.stringify(newArrivals.map(p => p.id)) === JSON.stringify(latest.map(p => p.id)));

// ─────────────── CART ───────────────
let cart = {};
cart = addToCart(cart, 1);
cart = addToCart(cart, 1);
cart = addToCart(cart, 13);
assertStep("Cart quantities after adds", cart, { 1:2, 13:1 });
cart = setQty(cart, 1, 1);
assertStep("Quantity update", cart, { 1:1, 13:1 });
cart = setQty(cart, 13, 0);
assertStep("Quantity 0 removes item", cart, { 1:1 });
assertTrue("Cart subtotal correct", cartSubtotal({ 1:2, 5:1 }) === 285000 * 2 + 82000);
assertTrue("Cart GST 18%", cartGst(100000, 0) === 18000);
assertTrue("Cart GST on discounted base", cartGst(100000, 10000) === Math.round(90000 * 0.18));

// ─────────────── COUPONS ───────────────
const deskto10 = applyCoupon("deskto10", 100000);
assertStep("DESKTO10 gives 10%", deskto10, { code:"DESKTO10", discountPct:10 });
assertTrue("DESKTO10 saves 10% on 100000", cartDiscount(100000, deskto10) === 10000);

const welcome5High = applyCoupon("WELCOME5", 100000);
assertStep("WELCOME5 over 50k gives flat 5000", welcome5High, { code:"WELCOME5", discountPct:0, flatOff:5000, minSubtotal:50000 });
const welcome5Low = applyCoupon("WELCOME5", 40000);
assertStep("WELCOME5 below 50k returns null", welcome5Low, null);

const unknown = applyCoupon("NOPE", 100000);
assertStep("Unknown coupon returns null", unknown, null);

// ─────────────── ADDRESS ───────────────
const ok = { name:"Aditya Kumar", phone:"+91 9876543210", email:"aditya@example.com", line1:"A-12 Saket", line2:"", city:"New Delhi", state:"Delhi", pincode:"110017", country:"India" };
assertStep("Valid address passes", validateAddress(ok), null);
assertTrue("Missing name fails", !!validateAddress({ ...ok, name:"" }));
assertTrue("Short name fails", !!validateAddress({ ...ok, name:"A" }));
assertTrue("Phone < 10 digits fails", !!validateAddress({ ...ok, phone:"12345" }));
assertTrue("Bad email fails", !!validateAddress({ ...ok, email:"not-an-email" }));
assertTrue("Missing line1 fails", !!validateAddress({ ...ok, line1:"" }));
assertTrue("Missing city fails", !!validateAddress({ ...ok, city:"" }));
assertTrue("Missing state fails", !!validateAddress({ ...ok, state:"" }));
assertTrue("Pincode 5 digits fails", !!validateAddress({ ...ok, pincode:"11001" }));
assertTrue("Pincode with letters fails", !!validateAddress({ ...ok, pincode:"11001A" }));

// ─────────────── DELIVERY + SHIPPING ───────────────
assertTrue("Free shipping over 50k", cartGrandTotal({ 11:1 }, null, "ship") === 54000 + Math.round(54000 * 0.18) + 0); // = 63720
assertTrue("499 shipping under 50k", cartGrandTotal({ 30:1 }, null, "ship") === 2900 + Math.round(2900 * 0.18) + 499);
assertTrue("Pickup free regardless of subtotal", cartGrandTotal({ 11:1 }, null, "pickup") === 54000 + Math.round(54000 * 0.18) + 0);

// ─────────────── ORDER LIFECYCLE ───────────────
let order = { cart:{1:1, 11:1}, payment:{ method:"upi" } };
order = placeOrder(order);
assertTrue("placeOrder sets RESERVED + orderId", order.status === "RESERVED" && /^ORD-/.test(order.orderId));
order = markPaid(order);
assertTrue("markPaid transitions RESERVED → PAID", order.status === "PAID");
order = markShipped(order);
assertTrue("markShipped → SHIPPED", order.status === "SHIPPED");
order = markDelivered(order);
assertTrue("markDelivered → DELIVERED", order.status === "DELIVERED");
assertStep("UPI payment is PAID", paymentStatus({ payment:{ method:"upi" } }), "PAID");
assertStep("Card payment is PAID", paymentStatus({ payment:{ method:"card" } }), "PAID");
assertStep("NetBanking is PAID", paymentStatus({ payment:{ method:"netbanking" } }), "PAID");
assertStep("Wallet is PAID", paymentStatus({ payment:{ method:"wallet" } }), "PAID");
assertStep("COD payment is PENDING", paymentStatus({ payment:{ method:"cod" } }), "PENDING");

// ─────────────── EMPTY CART BLOCKS ORDER ───────────────
const empty = placeOrder({ cart:{}, payment:{ method:"upi" } });
assertStep("Empty cart blocked from order", empty.status, "EMPTY_CART");

// ─────────────── COUPON APPLIED TO GRAND TOTAL ───────────────
const grand = cartGrandTotal({ 11:1, 1:1 }, { code:"DESKTO10", discountPct:10 }, "ship");
const sub = 285000 + 54000;
const disc = Math.round(sub * 0.10);
const expected = sub - disc + Math.round((sub - disc) * 0.18) + 0;
assertStep("Grand total with DESKTO10 coupon", grand, expected);

console.table(results.map(({ name, pass, actual }) => ({ Step:name, Result:pass ? "PASS" : "FAIL", Actual:actual })));
console.log(`\n✅ Validated ${results.length} unified product + checkout workflow steps.`);
