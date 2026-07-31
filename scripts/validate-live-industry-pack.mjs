import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.WEBSITE_URL || "http://localhost:5173";

async function runTests() {
  console.log("=== STARTING INDUSTRY PACK VALIDATION TESTS ===");
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Forward browser console logs to terminal
    page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
    
    console.log(`🌐 Navigating to ${base}...`);
    await page.goto(base, { waitUntil: "networkidle" });

    
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Proving pack-enabled behavior (default)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔎 Proving default pack-enabled behavior...");
    
    // Check Services nav link exists
    const servicesLink = page.locator('nav a:has-text("Services")').first();
    const isServicesVisible = await servicesLink.isVisible();
    assert.equal(isServicesVisible, true, "Services link should be visible in header when pack is enabled");
    console.log("✅ PASS: Services link is visible in navbar.");

    // Check Gaming Info nav link exists
    const gamingLink = page.locator('nav a:has-text("Gaming Info")').first();
    const isGamingVisible = await gamingLink.isVisible();
    assert.equal(isGamingVisible, true, "Gaming Info link should be visible in header when pack is enabled");
    console.log("✅ PASS: Gaming Info link is visible in navbar.");

    // Navigate to /services and verify Services index page is present
    await page.goto(`${base}/services`, { waitUntil: "networkidle" });
    const servicesPageEyebrow = page.locator('text=Beyond the Machine').first();
    const isServicesPageLoaded = await servicesPageEyebrow.isVisible();
    assert.equal(isServicesPageLoaded, true, "Services index page should be visible on /services when pack is enabled");
    
    const initialBody = await page.textContent('body');
    assert.equal(initialBody.includes("Premium Gaming Machines"), false, "Homepage hero should NOT be visible on /services when pack is enabled");
    console.log("✅ PASS: Services index page loaded successfully without homepage hero.");



    // ─────────────────────────────────────────────────────────────────────────
    // 2. Proving pack-disabled behavior
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔎 Proving pack-disabled behavior...");
    
    // Disable pack and trigger re-render
    await page.evaluate(() => {
      window.packRegistry.setActivePack(null);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(500);

    // Verify nav links disappeared
    const isServicesVisibleAfter = await servicesLink.isVisible();
    assert.equal(isServicesVisibleAfter, false, "Services link should be hidden in header when pack is disabled");
    console.log("✅ PASS: Services link disappeared from navbar.");

    const isGamingVisibleAfter = await gamingLink.isVisible();
    assert.equal(isGamingVisibleAfter, false, "Gaming Info link should be hidden in header when pack is disabled");
    console.log("✅ PASS: Gaming Info link disappeared from navbar.");

    // Verify /services route acts as NotFound/falls back to Home (doesn't render ServicesPage)
    await page.goto(`${base}/services`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      window.packRegistry.setActivePack(null);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(500);
    
    const bodyText = await page.textContent('body');
    const hasHomepageHero = bodyText.includes("Premium Gaming Machines");
    console.log(`[Diagnostic] Page body has homepage hero text: ${hasHomepageHero}`);
    
    assert.equal(hasHomepageHero, true, "Services route should fall back to the Home page (Premium Gaming Machines hero text) when pack is disabled");
    console.log("✅ PASS: Services route successfully hidden (fell back to Home page).");




    // ─────────────────────────────────────────────────────────────────────────
    // 3. Proving Admin Dashboard tab modularity
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔎 Proving Admin Dashboard tab dynamic hiding/showing...");
    
    // Sign in as Admin
    await page.goto(`${base}/sign-in`, { waitUntil: "networkidle" });
    const identifierInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await identifierInput.fill("admin@deskto.com");
    await passwordInput.fill("admin123");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL("**/dashboard/admin", { timeout: 15_000 });
    await page.waitForTimeout(1000);

    // Check Repairs tab is visible (since pack is enabled by default in new session load)
    const repairsSidebarTab = page.locator('aside a, aside button:has-text("Repairs")').first();
    const isRepairsTabVisible = await repairsSidebarTab.isVisible();
    assert.equal(isRepairsTabVisible, true, "Repairs tab should be visible in Admin Sidebar when pack is enabled");
    console.log("✅ PASS: Repairs tab visible in Admin Dashboard.");

    // Check Custom Builder tab is visible
    const builderSidebarTab = page.locator('aside a, aside button:has-text("Custom Builder")').first();
    const isBuilderTabVisible = await builderSidebarTab.isVisible();
    assert.equal(isBuilderTabVisible, true, "Custom Builder tab should be visible in Admin Sidebar when pack is enabled");
    console.log("✅ PASS: Custom Builder tab visible in Admin Dashboard.");

    // Disable pack inside dashboard view
    await page.evaluate(() => {
      window.packRegistry.setActivePack(null);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(500);

    // Verify computer-retail specific tabs disappeared
    const isRepairsTabVisibleAfter = await repairsSidebarTab.isVisible();
    assert.equal(isRepairsTabVisibleAfter, false, "Repairs tab should be hidden in Admin Sidebar when pack is disabled");
    console.log("✅ PASS: Repairs tab disappeared from sidebar.");

    const isBuilderTabVisibleAfter = await builderSidebarTab.isVisible();
    assert.equal(isBuilderTabVisibleAfter, false, "Custom Builder tab should be hidden in Admin Sidebar when pack is disabled");
    console.log("✅ PASS: Custom Builder tab disappeared from sidebar.");

    // Verify Core Reusable tabs are STILL visible (DESKTO preservation)
    const catalogSidebarTab = page.locator('aside a, aside button:has-text("Catalog Management")').first();
    const isCatalogVisible = await catalogSidebarTab.isVisible();
    assert.equal(isCatalogVisible, true, "Catalog Management tab must remain visible when pack is disabled");
    console.log("✅ PASS: Reusable core tab 'Catalog Management' is still visible.");

    const customersSidebarTab = page.locator('aside a, aside button:has-text("Customers")').first();
    const isCustomersVisible = await customersSidebarTab.isVisible();
    assert.equal(isCustomersVisible, true, "Customers tab must remain visible when pack is disabled");
    console.log("✅ PASS: Reusable core tab 'Customers' is still visible.");

    console.log("\n🎉 ALL INDUSTRY PACK VALIDATION TESTS PASSED!");
    await context.close();
  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
