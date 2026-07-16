import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net";
const accounts = [
  { role: "admin", identifier: "admin@deskto.com", password: "admin123" },
  { role: "staff", identifier: "sales@deskto.com", password: "admin123" },
  { role: "customer", identifier: "test4@gmail.com", password: "admin123" },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const account of accounts) {
    // A new context represents another device: no cookies, localStorage,
    // sessionStorage, IndexedDB, or authentication state is shared.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/sign-in`, { waitUntil: "networkidle" });

    const identifier = page.locator('input[type="text"]').first();
    const password = page.locator('input[type="password"]').first();
    await identifier.fill(account.identifier);
    await password.fill(account.password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL(`**/dashboard/${account.role}`, { timeout: 15_000 });
    await page.waitForTimeout(900);

    const tokenPresent = await page.evaluate(() => Boolean(localStorage.getItem("deskto_access_token")));
    assert.equal(tokenPresent, true, `${account.role} access token missing`);

    const me = await page.evaluate(async () => {
      const token = localStorage.getItem("deskto_access_token");
      const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      return { status: response.status, body: await response.json() };
    });
    assert.equal(me.status, 200, `${account.role} /api/auth/me failed`);
    assert.equal(me.body.role, account.role, `${account.role} role mismatch`);
    assert.equal(new URL(page.url()).pathname, `/dashboard/${account.role}`);
    console.log(`PASS: clean-device ${account.role} login -> /dashboard/${account.role}`);
    await context.close();
  }
} finally {
  await browser.close();
}
