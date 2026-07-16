import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("deskto-auth-demo-state", JSON.stringify({
      currentUserId: "legacy-admin",
      users: [{
        id: "legacy-admin",
        email: "legacy-admin@example.invalid",
        firstName: "Legacy",
        lastName: "Admin",
        role: "admin",
        status: "active",
      }],
    }));
    localStorage.removeItem("deskto_access_token");
    localStorage.removeItem("deskto_refresh_token");
  });
  const page = await context.newPage();
  await page.goto(`${base}/dashboard/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  assert.equal(new URL(page.url()).pathname, "/sign-in");
  assert.equal(await page.getByText("401: No token provided").count(), 0);
  console.log("PASS: stale demo-admin session without JWT redirects to /sign-in");
} finally {
  await browser.close();
}
