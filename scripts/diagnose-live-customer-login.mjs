import { chromium } from "playwright";

const base = process.env.WEBSITE_URL || "https://d2tfbpn3o5piw8.cloudfront.net";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  let loginResult = null;
  page.on("response", async response => {
    if (response.url().includes("/api/auth/login")) {
      loginResult = { status: response.status(), body: await response.text() };
    }
  });
  await page.goto(`${base}/sign-in`, { waitUntil: "networkidle" });
  await page.locator('input[type="text"]').first().fill("demo@deskto.in");
  await page.locator('input[type="password"]').first().fill("admin123");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForTimeout(2500);
  const messages = await page.locator(".glass").allTextContents();
  console.log(JSON.stringify({ url: page.url(), loginResult, messages: messages.slice(-3) }, null, 2));
} finally {
  await browser.close();
}
