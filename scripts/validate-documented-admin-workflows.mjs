import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:5173";

const workflows = [
  ["overview", "Overview"],
  ["categories", "Categories"],
  ["brands", "Brands"],
  ["inventory", "Inventory / Products"],
  ["products", "Catalog Management"],
  ["orders", "Orders"],
  ["repairs", "Repairs"],
  ["builds", "PC Builds / Custom Builder"],
  ["assembly", "Assembly"],
  ["upgrades", "Upgrades"],
  ["software", "Software Services"],
  ["rentals", "Rentals"],
  ["deliveries", "Deliveries"],
  ["support", "Remote Support"],
  ["marketplace", "Sell Used"],
  ["crm", "CRM"],
  ["customers", "Customers"],
  ["staff", "Staff"],
  ["suppliers", "Suppliers"],
  ["purchase-orders", "Purchase Orders"],
  ["coupons", "Coupons"],
  ["offers", "Offers"],
  ["gaming", "Gaming Hub Management"],
  ["featured-builds", "Featured Builds"],
  ["exclusive-offers", "Exclusive Offers"],
  ["gaming-news", "Gaming News"],
  ["testimonials", "Testimonials"],
  ["reports", "Reports & Analytics"],
  ["notifications", "Notifications"],
  ["settings", "Settings"],
  ["audit", "Audit Logs"],
  ["backup", "Backup & Restore"],
];

const knownNoisyConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource/i,
  /net::ERR_FAILED/i,
  /favicon/i,
];

function seededAuthState() {
  return {
    users: [{
      id: "usr_documented_admin",
      name: "Documented Admin",
      email: "documented.admin@deskto.in",
      phone: "9999990000",
      passwordHash: "demo_bcrypt_YWRtaW4xMjM",
      role: "admin",
      emailVerified: true,
      phoneVerified: true,
      status: "active",
      loginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
    pendingSignup: null,
    resetRequest: null,
    sessions: [{
      id: "sess_documented_admin",
      userId: "usr_documented_admin",
      refreshToken: "refresh_documented_admin",
      device: "Validation browser",
      ip: "127.0.0.1",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    auditLogs: [],
    currentUserId: "usr_documented_admin",
    accessToken: "jwt_documented_admin",
  };
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const [tab, documentedName] of workflows) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });

  await context.addInitScript((authState) => {
    window.localStorage.removeItem("deskto_access_token");
    window.localStorage.removeItem("deskto_refresh_token");
    window.localStorage.removeItem("deskto-dashboard-v1");
    window.localStorage.setItem("deskto-auth-demo-state", JSON.stringify(authState));
  }, seededAuthState());

  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", error => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  page.on("console", message => {
    if (!["error", "warning"].includes(message.type())) return;
    const text = message.text();
    if (knownNoisyConsolePatterns.some(pattern => pattern.test(text))) return;
    browserErrors.push(`${message.type()}: ${text}`);
  });

  const url = `${baseUrl}/dashboard/admin/${tab}`;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(350);

    const bodyText = await page.locator("body").innerText({ timeout: 5000 });
    const title = await page.title().catch(() => "");
    const currentUrl = page.url();
    const fatalText = [
      "Dashboard section could not load",
      "Dashboard could not load",
      "Role mismatch",
      "Redirecting to sign-in",
      "Route not found",
    ].find(text => bodyText.includes(text));

    const hasAdminContext = bodyText.includes("Documented Admin") || bodyText.includes("Admin");
    const expectedContentVisible = bodyText.length > 100;

    const failed = !response ||
      response.status() >= 400 ||
      Boolean(fatalText) ||
      browserErrors.length > 0 ||
      !currentUrl.includes(`/dashboard/admin/${tab}`) ||
      !hasAdminContext ||
      !expectedContentVisible;

    const result = {
      tab,
      documentedName,
      status: response?.status() ?? "no-response",
      title,
      url: currentUrl,
      errors: browserErrors,
      fatalText,
      hasAdminContext,
      expectedContentVisible,
    };

    results.push(result);
    if (failed) failures.push(result);
    console.log(`${failed ? "FAIL" : "PASS"} ${documentedName} (${tab}) status=${result.status} errors=${browserErrors.length}`);
  } catch (error) {
    const result = {
      tab,
      documentedName,
      status: "exception",
      title: "",
      url,
      errors: [`exception: ${error.message}`],
      fatalText: null,
      hasAdminContext: false,
      expectedContentVisible: false,
    };
    results.push(result);
    failures.push(result);
    console.log(`FAIL ${documentedName} (${tab}) exception=${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();

console.log("\nDocumented admin workflow validation summary");
console.log(`Checked: ${results.length}`);
console.log(`Passed: ${results.length - failures.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}
