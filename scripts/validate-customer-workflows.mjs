import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:5173";

const tabs = [
  "overview",
  "profile",
  "addresses",
  "orders",
  "repairs",
  "upgrades",
  "software",
  "rentals",
  "sell",
  "builds",
  "assembly",
  "support",
  "wishlist",
  "cart",
  "notifications",
  "reviews",
  "invoices",
  "warranty",
  "rewards",
  "logout",
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
      id: "demo_user",
      name: "Demo Customer",
      email: "demo@deskto.in",
      phone: "9876543215",
      passwordHash: "demo_bcrypt_YWRtaW4xMjM",
      role: "customer",
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
      id: "sess_demo_customer",
      userId: "demo_user",
      refreshToken: "refresh_demo_customer",
      device: "Validation browser",
      ip: "127.0.0.1",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    auditLogs: [],
    currentUserId: "demo_user",
    accessToken: "jwt_demo_customer",
  };
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const tab of tabs) {
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

  const url = `${baseUrl}/dashboard/customer/${tab}`;
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

    const hasCustomerContext = bodyText.includes("Demo Customer") || bodyText.includes("Customer");
    const expectedTabContentVisible = tab === "logout"
      ? bodyText.includes("Sign Out") || bodyText.includes("Logout")
      : bodyText.length > 100;

    const failed = !response ||
      response.status() >= 400 ||
      Boolean(fatalText) ||
      browserErrors.length > 0 ||
      !currentUrl.includes(`/dashboard/customer/${tab}`) ||
      !hasCustomerContext ||
      !expectedTabContentVisible;

    const result = {
      tab,
      status: response?.status() ?? "no-response",
      title,
      url: currentUrl,
      errors: browserErrors,
      fatalText,
      hasCustomerContext,
      expectedTabContentVisible,
    };

    results.push(result);
    if (failed) failures.push(result);
    console.log(`${failed ? "FAIL" : "PASS"} ${tab} status=${result.status} errors=${browserErrors.length}`);
  } catch (error) {
    const result = {
      tab,
      status: "exception",
      title: "",
      url,
      errors: [`exception: ${error.message}`],
      fatalText: null,
      hasCustomerContext: false,
      expectedTabContentVisible: false,
    };
    results.push(result);
    failures.push(result);
    console.log(`FAIL ${tab} exception=${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();

console.log("\nCustomer workflow validation summary");
console.log(`Checked: ${results.length}`);
console.log(`Passed: ${results.length - failures.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}
