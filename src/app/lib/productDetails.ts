// Synthetic product details generator.
// Mirrors the shape of the PRODUCTS array in App.tsx (we don't import the
// real one to keep this module decoupled; the type is structurally
// compatible with `typeof PRODUCTS[number]` from App.tsx).

export type ProductLike = {
  id: number;
  name: string;
  type: "gaming" | "general";
  category: string;
  condition: "first-hand" | "second-hand";
  brand: string;
  price: number;
  orig: number | null;
  rating: number;
  reviews: number;
  badge: string | null;
  inStock: boolean;
  warrantyMonths: number;
  rgb: boolean;
  specs: string[];
  img: string;
  createdAt: number;
  popularity: number;
  sales: number;
  serial?: string;
  qualityReport?: string;
  gallery?: string[];
  model?: string;
  operatingSystem?: string;
  weight?: string;
  dimensions?: string;
  processor?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  display?: string;
  refreshRate?: string;
  powerRequirement?: string;
  ports?: string;
  description?: string;
  technicalDetails?: string;
  useCase?: string;
  performanceNotes?: string;
  qualityNotes?: string;
  features?: string[];
  boxContents?: string[];
  compatibility?: string[];
  upgradeOptions?: string[];
  recommendedAccessories?: string[];
  deliveryInfo?: { homeDelivery: boolean; storePickup: boolean; estimatedDelivery: string; shippingCharges: number };
  warrantyInfo?: { type: string; claimProcess: string };
};

export type ProductDetails = {
  gallery: string[];
  fullSpecs: { key: string; value: string; icon: string }[];
  description: {
    overview: string;
    keyFeatures: string[];
    technical: string;
    boxContents: string[];
  };
  reviews: {
    name: string;
    initial: string;
    rating: number;
    date: string;
    text: string;
    verified: boolean;
  }[];
  ratingBreakdown: { stars: number; count: number; pct: number }[];
  related: { similar: number[]; frequentlyBought: number[]; recommended: number[] };
  compatibility: { components: string[]; upgrades: string[]; accessories: string[] };
  delivery: {
    estimatedDate: string;
    homeDelivery: boolean;
    storePickup: boolean;
    shippingCharge: number;
  };
  warranty: { period: string; type: string; claimProcess: string };
  support: { whatsapp: string; phone: string; liveChat: boolean };
  usedExtras?: {
    conditionGrade: string;
    inspection: string;
    qualityCheck: string;
    serial: string;
    originalPurchaseDate: string;
    remainingWarranty: string;
    refurbishedBy: string;
    testedComponents: string[];
    cosmetic: string;
    functional: string;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  laptop: "Laptop",
  "desktop-pc": "Desktop PC",
  "gaming-pc": "Gaming PC",
  "gaming-laptop": "Gaming Laptop",
  monitor: "Monitor",
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  ssd: "SSD",
  hdd: "HDD",
  nvme: "NVMe",
  motherboard: "Motherboard",
  psu: "PSU",
  cabinet: "Cabinet",
  keyboard: "Keyboard",
  mouse: "Mouse",
  headset: "Headset",
  router: "Router",
  ups: "UPS",
  printer: "Printer",
  scanner: "Scanner",
  accessories: "Accessories",
  others: "Others",
};

const NAMES = [
  "Aarav Sharma", "Priya Iyer", "Rohan Mehta", "Sneha Patel", "Vikram Reddy",
  "Ananya Singh", "Karan Bhatia", "Riya Nair", "Aditya Verma", "Isha Kapoor",
  "Manish Gupta", "Pooja Joshi", "Siddharth Rao", "Tanya Malhotra", "Harsh Pillai",
  "Nisha Kulkarni", "Rahul Saxena", "Divya Bansal", "Amit Tiwari", "Sakshi Choudhary",
  "Kunal Desai", "Megha Bhatt", "Saurabh Khanna", "Tanvi Agarwal", "Yash Mittal",
  "Neha Pandey", "Arjun Goyal", "Rashi Dwivedi", "Varun Bajaj", "Simran Kaur",
];

const REVIEW_TEMPLATES = [
  "Absolutely loving the {brand} {name}! Performance is top-notch and it handles everything I throw at it.",
  "Great value for the price. Build quality is solid and the specs are exactly as advertised.",
  "Fast delivery, well packaged. {brand} has done a great job with this one. Highly recommended.",
  "Been using it for 2 weeks now — no complaints. The {spec0} really stands out.",
  "Solid product. A few minor cosmetic things but performance-wise it's fantastic.",
  "Worth every rupee. Upgraded from my old rig and the difference is night and day.",
  "Customer support was very helpful. Product works as described. Will buy from DESKTO again.",
  "Premium feel, premium performance. The {spec1} is a beast in modern titles.",
];

const PAIRINGS: Record<string, string[]> = {
  "gaming-pc": ["keyboard", "mouse", "monitor"],
  "desktop-pc": ["keyboard", "mouse", "monitor"],
  "gaming-laptop": ["mouse", "headset", "keyboard"],
  laptop: ["mouse", "headset", "accessories"],
  gpu: ["psu", "cabinet", "motherboard"],
  cpu: ["motherboard", "ram", "cooler"],
  ram: ["motherboard", "cpu"],
  nvme: ["motherboard", "cabinet"],
  ssd: ["motherboard", "cabinet"],
  hdd: ["cabinet", "accessories"],
  motherboard: ["cpu", "ram", "cabinet"],
  psu: ["cabinet", "motherboard"],
  cabinet: ["motherboard", "cooler", "psu"],
  monitor: ["keyboard", "mouse", "headset"],
  keyboard: ["mouse", "mousepad", "headset"],
  mouse: ["keyboard", "mousepad", "monitor"],
  headset: ["mouse", "keyboard", "mousepad"],
  router: ["accessories", "ups"],
  ups: ["router", "monitor"],
  printer: ["scanner", "ups"],
  scanner: ["printer", "ups"],
  accessories: ["mouse", "keyboard", "headset"],
  others: ["accessories", "keyboard", "mouse"],
};

// Curated Unsplash fallbacks for the gallery (only used if URL rewriting fails)
const FALLBACK_GALLERY = [
  "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1593640408182-31c228a7e5e1?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=800&fit=crop&auto=format",
];

// Stable pseudo-random based on product id (no Math.random in render path)
function seedHash(id: number, salt: number): number {
  let x = (id * 9301 + salt * 49297) % 233280;
  return x / 233280;
}

function rewriteImg(url: string, w: number, h: number): string {
  if (!url) return FALLBACK_GALLERY[0];
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(w));
    u.searchParams.set("h", String(h));
    u.searchParams.set("fit", "crop");
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
    return u.toString();
  } catch {
    return url;
  }
}

function buildGallery(p: ProductLike): string[] {
  if (p.gallery?.length) return p.gallery.slice(0, 6);
  const main = rewriteImg(p.img, 800, 800);
  // Use the main image plus rotated/sized variants of itself
  const variants = [
    main,
    rewriteImg(p.img, 800, 800),
    rewriteImg(p.img, 800, 800),
    rewriteImg(p.img, 800, 800),
    rewriteImg(p.img, 800, 800),
    rewriteImg(p.img, 800, 800),
  ];
  // Replace duplicates with fallbacks for variety
  const seen = new Set<string>();
  const out: string[] = [];
  variants.forEach((v, i) => {
    if (seen.has(v) || !v) {
      out.push(FALLBACK_GALLERY[(i + p.id) % FALLBACK_GALLERY.length]);
    } else {
      seen.add(v);
      out.push(v);
    }
  });
  return out;
}

function deriveSpecValue(specs: string[], keywords: RegExp): string | null {
  for (const s of specs) {
    if (keywords.test(s)) return s;
  }
  return null;
}

function buildFullSpecs(p: ProductLike): { key: string; value: string; icon: string }[] {
  const adminSpecs = [
    ["Brand", p.brand, "Tag"],
    ["Model", p.model || p.name, "Package"],
    ["Category", CATEGORY_LABELS[p.category] ?? p.category, "Layers"],
    ["Operating System", p.operatingSystem, "Monitor"],
    ["Processor", p.processor, "Cpu"],
    ["Graphics Card", p.gpu, "Zap"],
    ["RAM", p.ram, "Layers"],
    ["Storage", p.storage, "HardDrive"],
    ["Display", p.display, "Monitor"],
    ["Refresh Rate", p.refreshRate, "RefreshCw"],
    ["Power Requirement", p.powerRequirement, "Zap"],
    ["Ports", p.ports, "Plug"],
    ["Dimensions", p.dimensions, "Box"],
    ["RGB Support", typeof p.rgb === "boolean" ? (p.rgb ? "Yes" : "No") : undefined, "Sparkles"],
    ["Weight", p.weight, "Weight"],
  ].filter(([, value]) => Boolean(value)) as string[][];
  if (adminSpecs.length > 5 && (p.operatingSystem || p.model || p.weight || p.dimensions)) {
    return adminSpecs.map(([key, value, icon]) => ({ key, value, icon }));
  }
  const isPc = p.category === "gaming-pc" || p.category === "desktop-pc";
  const isLaptop = p.category === "laptop" || p.category === "gaming-laptop";
  const isPeripheral =
    p.category === "keyboard" ||
    p.category === "mouse" ||
    p.category === "headset" ||
    p.category === "monitor";
  const isStorage = p.category === "nvme" || p.category === "ssd" || p.category === "hdd";

  const out: { key: string; value: string; icon: string }[] = [];

  out.push({ key: "Brand", value: p.brand, icon: "Tag" });
  out.push({ key: "Model", value: p.name, icon: "Package" });
  out.push({ key: "Category", value: CATEGORY_LABELS[p.category] ?? p.category, icon: "Layers" });

  const proc = deriveSpecValue(p.specs, /i\d|Ryzen|Threadripper|Xeon|Core/i);
  if (proc) out.push({ key: "Processor", value: proc, icon: "Cpu" });

  const gpu = deriveSpecValue(p.specs, /RTX|GTX|Radeon|RX |Arc /i);
  if (gpu) out.push({ key: "Graphics Card", value: gpu, icon: "Zap" });

  const ram = deriveSpecValue(p.specs, /DDR|GB|GB RAM|RAM/i);
  if (ram && /\d\s*GB/.test(ram)) out.push({ key: "RAM", value: ram, icon: "Layers" });

  const storage = deriveSpecValue(p.specs, /NVMe|SSD|HDD|TB|Storage/i);
  if (storage) out.push({ key: "Storage", value: storage, icon: "HardDrive" });

  if (isPc || isLaptop) {
    const mb = deriveSpecValue(p.specs, /LGA|AM\d|B\d|X\d|Z\d|Board|Motherboard/i);
    out.push({ key: "Motherboard", value: mb ?? (isPc ? "ATX Motherboard (varies)" : "Integrated"), icon: "CircuitBoard" });

    const psu = deriveSpecValue(p.specs, /\d+W|Gold|Platinum|Bronze|PSU/i);
    if (psu && isPc) out.push({ key: "Power Supply", value: psu, icon: "Zap" });

    const cabinet = deriveSpecValue(p.specs, /Tower|ATX|Mid|E-ATX|Case|Cabinet/i);
    if (cabinet && isPc) out.push({ key: "Cabinet", value: cabinet, icon: "Box" });
  }

  out.push({
    key: "Operating System",
    value:
      p.condition === "second-hand"
        ? "Windows 10 / 11 Compatible"
        : isPeripheral
        ? "Driver Plug & Play"
        : "Windows 11 Home",
    icon: "Monitor",
  });

  out.push({ key: "RGB Support", value: p.rgb ? "Yes" : "No", icon: "Sparkles" });

  if (isPc || isLaptop) {
    out.push({
      key: "Ports",
      value:
        isLaptop
          ? "USB-C, USB-A 3.2 x2, HDMI, Audio Jack, Wi-Fi"
          : "USB 3.2 x4, USB-C x1, HDMI x1, DisplayPort x1, Audio Jack, Ethernet",
      icon: "Plug",
    });
    out.push({
      key: "Wi-Fi / Bluetooth",
      value: p.condition === "second-hand" ? "Wi-Fi 5, Bluetooth 5.0" : "Wi-Fi 6, Bluetooth 5.2",
      icon: "Wifi",
    });
    const w = (3 + seedHash(p.id, 1) * 5).toFixed(1);
    out.push({ key: "Weight", value: `${w} kg`, icon: "Weight" });
  }

  if (isStorage) {
    out.push({ key: "Form Factor", value: p.category === "nvme" ? "M.2 2280" : p.category === "ssd" ? '2.5"' : '2.5"', icon: "HardDrive" });
    out.push({ key: "Interface", value: p.category === "hdd" ? "USB 3.0" : "SATA / PCIe", icon: "Cable" });
  }

  if (isPeripheral) {
    const w = (0.1 + seedHash(p.id, 2) * 0.8).toFixed(2);
    out.push({ key: "Weight", value: `${w} kg`, icon: "Weight" });
  }

  return out;
}

function buildDescription(p: ProductLike): ProductDetails["description"] {
  if (p.description || p.technicalDetails || p.features?.length || p.boxContents?.length) {
    return {
      overview: p.description || `${p.brand} ${p.name} is configured and verified by DESKTO.`,
      keyFeatures: p.features?.length ? p.features : p.specs,
      technical: [p.technicalDetails, p.useCase, p.performanceNotes, p.qualityNotes].filter(Boolean).join("\n\n") || "Technical details verified by DESKTO catalog management.",
      boxContents: p.boxContents?.length ? p.boxContents : [`1x ${p.name}`, "Power Cable / Adapter", "Warranty Card"],
    };
  }
  const category = CATEGORY_LABELS[p.category] ?? p.category;
  const heroSpec = p.specs[0] ?? "premium components";
  const isGaming = p.type === "gaming";

  const overview =
    `The ${p.brand} ${p.name} is a ${isGaming ? "performance-tuned" : "reliable"} ${category.toLowerCase()} ` +
    `engineered for ${isGaming ? "gamers, creators, and power users" : "professionals and everyday computing"}. ` +
    `Powered by ${heroSpec}, it delivers a fluid, responsive experience across modern workloads. ` +
    `\n\nWhether you're pushing high frame rates in AAA titles, rendering complex 3D scenes, or multitasking across ` +
    `dozens of browser tabs, this ${category.toLowerCase()} keeps up without breaking a sweat. ` +
    `Built with quality components and rigorously stress-tested at the DESKTO lab, it's ready to perform right out of the box.`;

  const keyFeatures = [
    `${heroSpec} — flagship-grade performance`,
    `Built and tested by DESKTO engineers`,
    `${p.warrantyMonths}-month manufacturer warranty`,
    p.rgb ? "Addressable RGB lighting with software control" : "Clean, minimalist design",
    p.condition === "second-hand" ? "Refurbished and certified by DESKTO" : "Brand new factory-sealed unit",
  ];

  const technical =
    `At its core, the ${p.name} leverages ${heroSpec}, paired with carefully matched components to avoid ` +
    `bottlenecks. Thermal performance is validated across 24-hour stress tests, ensuring sustained clock speeds ` +
    `under load. The ${p.rgb ? "RGB-enabled" : "stealth"} design blends aesthetics with function, while the ` +
    `supplied ${p.warrantyMonths}-month warranty gives you peace of mind.`;

  const boxContents = [
    `1x ${p.name}`,
    "Power Cable / Adapter",
    "User Manual & Quick Start Guide",
    "Warranty Card",
  ];
  if (isGaming) boxContents.push("DESKTO Welcome Pack");
  if (p.category === "laptop" || p.category === "gaming-laptop") boxContents.push("65W / 120W Charger");

  return { overview, keyFeatures, technical, boxContents };
}

function buildReviews(p: ProductLike): ProductDetails["reviews"] {
  const out: ProductDetails["reviews"] = [];
  const totalReviews = 6;
  const now = Date.now();

  for (let i = 0; i < totalReviews; i++) {
    const nameIdx = Math.floor(seedHash(p.id, 10 + i) * NAMES.length);
    const name = NAMES[nameIdx];
    const initial = name[0];
    // Distribute ratings around p.rating
    const r = p.rating;
    const variance = (seedHash(p.id, 20 + i) - 0.5) * 1.6;
    const rating = Math.max(3, Math.min(5, Math.round(r + variance)));
    const daysAgo = Math.floor(seedHash(p.id, 30 + i) * 90) + 1;
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const tplIdx = Math.floor(seedHash(p.id, 40 + i) * REVIEW_TEMPLATES.length);
    const tpl = REVIEW_TEMPLATES[tplIdx];
    const text = tpl
      .replace(/{brand}/g, p.brand)
      .replace(/{name}/g, p.name)
      .replace(/{spec0}/g, p.specs[0] ?? "performance")
      .replace(/{spec1}/g, p.specs[1] ?? p.specs[0] ?? "performance");
    out.push({ name, initial, rating, date, text, verified: i % 3 !== 1 });
  }
  return out;
}

function buildRatingBreakdown(p: ProductLike): ProductDetails["ratingBreakdown"] {
  const total = p.reviews;
  // Weight around p.rating
  const r = p.rating;
  const weights = [0.02, 0.05, 0.08, 0.25, 0.6];
  // Adjust weights so the expected value matches r
  const counts = weights.map((w, i) => {
    const stars = i + 1;
    const dist = Math.exp(-Math.abs(stars - r) * 1.3);
    return dist;
  });
  const sum = counts.reduce((a, b) => a + b, 0);
  return counts
    .map((c, i) => {
      const count = Math.round((c / sum) * total);
      return { stars: i + 1, count, pct: (c / sum) * 100 };
    })
    .reverse(); // 5 stars first
}

function buildRelated(
  p: ProductLike,
  allProducts: { id: number; category: string; brand: string; type: string }[]
): ProductDetails["related"] {
  const similar = allProducts
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4)
    .map((x) => x.id);

  const pairCats = PAIRINGS[p.category] ?? ["accessories", "mouse", "keyboard"];
  const frequentlyBought = pairCats
    .map((cat) => allProducts.find((x) => x.category === cat))
    .filter((x): x is { id: number; category: string; brand: string; type: string } => Boolean(x))
    .slice(0, 3)
    .map((x) => x.id);

  const recommended = allProducts
    .filter((x) => x.brand === p.brand && x.id !== p.id)
    .slice(0, 3)
    .map((x) => x.id);

  return { similar, frequentlyBought, recommended };
}

function buildCompatibility(p: ProductLike): ProductDetails["compatibility"] {
  if (p.compatibility?.length || p.upgradeOptions?.length || p.recommendedAccessories?.length) {
    return {
      components: p.compatibility?.length ? p.compatibility : ["Compatible with supported DESKTO catalog components"],
      upgrades: p.upgradeOptions?.length ? p.upgradeOptions : ["Upgrade options reviewed by DESKTO"],
      accessories: p.recommendedAccessories?.length ? p.recommendedAccessories : ["Recommended DESKTO accessories"],
    };
  }
  const isPc = p.category === "gaming-pc" || p.category === "desktop-pc";
  const isLaptop = p.category === "laptop" || p.category === "gaming-laptop";
  if (isPc || isLaptop) {
    return {
      components: [
        "DDR4/DDR5 RAM modules",
        "M.2 NVMe / 2.5\" SATA SSDs",
        "Standard ATX/Micro-ATX motherboards",
        "Dedicated GPUs up to 3-slot width",
      ],
      upgrades: [
        "Add up to 64GB RAM",
        "Install secondary NVMe for storage expansion",
        "Upgrade GPU for higher frame rates",
        "Add liquid cooling for sustained boost clocks",
      ],
      accessories: [
        "Mechanical gaming keyboard",
        "High-DPI gaming mouse",
        "Curved QHD/4K monitor",
        "Noise-isolating headset",
      ],
    };
  }
  return {
    components: ["Compatible with all modern PC builds"],
    upgrades: ["Pair with complementary DESKTO components"],
    accessories: ["Recommended DESKTO mouse, keyboard, or monitor"],
  };
}

function buildDelivery(p: ProductLike): ProductDetails["delivery"] {
  if (p.deliveryInfo) {
    return {
      estimatedDate: p.deliveryInfo.estimatedDelivery,
      homeDelivery: p.deliveryInfo.homeDelivery,
      storePickup: p.deliveryInfo.storePickup,
      shippingCharge: p.deliveryInfo.shippingCharges,
    };
  }
  const days = p.price > 100000 ? 4 + Math.floor(seedHash(p.id, 50) * 3) : 5 + Math.floor(seedHash(p.id, 51) * 3);
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return {
    estimatedDate: date,
    homeDelivery: true,
    storePickup: true,
    shippingCharge: p.price > 50000 ? 0 : 499,
  };
}

function buildWarranty(p: ProductLike): ProductDetails["warranty"] {
  return {
    period: p.warrantyMonths > 0 ? `${p.warrantyMonths} months` : "No warranty",
    type: p.warrantyInfo?.type || (p.condition === "second-hand" ? "Refurbishment Warranty" : "Manufacturer Warranty"),
    claimProcess:
      p.warrantyInfo?.claimProcess || "Contact DESKTO support via WhatsApp or call. Provide your serial number and invoice. Our team arranges pickup, diagnosis, and repair or replacement under warranty terms.",
  };
}

function buildSupport(): ProductDetails["support"] {
  return {
    whatsapp: "+91-98765-43210",
    phone: "+91-98765-43210",
    liveChat: true,
  };
}

function buildUsedExtras(p: ProductLike): ProductDetails["usedExtras"] {
  if (p.condition !== "second-hand") return undefined;
  const yr = Math.floor(p.createdAt / 10000);
  const mo = Math.floor((p.createdAt % 10000) / 100);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return {
    conditionGrade: p.qualityReport ?? "8/10 — Fully serviced",
    inspection: p.qualityReport ?? "Passed full DESKTO inspection checklist",
    qualityCheck: "24-hour stress test, thermal validation, port & key functional test",
    serial: p.serial ?? "DT-UNKNOWN",
    originalPurchaseDate: `${monthNames[mo - 1] ?? "Unknown"} ${yr}`,
    remainingWarranty: `${p.warrantyMonths} months`,
    refurbishedBy: "DESKTO Certified Refurbishment Lab",
    testedComponents: [
      "Stress test 24 hours",
      "Thermal validation under load",
      "Port & connector check",
      p.category === "laptop" || p.category === "gaming-laptop" ? "Battery health check" : "Power delivery check",
    ],
    cosmetic: "8/10 — Light surface wear, no major scratches or dents",
    functional: "All functions verified — fully operational",
  };
}

export function getProductDetails(
  p: ProductLike,
  allProducts: { id: number; category: string; brand: string; type: string }[] = []
): ProductDetails {
  return {
    gallery: buildGallery(p),
    fullSpecs: buildFullSpecs(p),
    description: buildDescription(p),
    reviews: buildReviews(p),
    ratingBreakdown: buildRatingBreakdown(p),
    related: buildRelated(p, allProducts),
    compatibility: buildCompatibility(p),
    delivery: buildDelivery(p),
    warranty: buildWarranty(p),
    support: buildSupport(),
    usedExtras: buildUsedExtras(p),
  };
}
