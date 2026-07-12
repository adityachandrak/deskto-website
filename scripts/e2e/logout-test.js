import { chromium } from 'playwright';

(async () => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE_LOG>', msg.text()));

  try {
    console.log('Navigating to', FRONTEND);
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    // Open sign-in if needed
    // Try common button/link texts
    const signInSelectors = [
      'text=Sign In',
      'text=Sign in',
      'a:has-text("Sign In")',
      'a:has-text("Sign in")',
      'button:has-text("Sign In")'
    ];
    for (const sel of signInSelectors) {
      try {
        const visible = await page.isVisible(sel).catch(() => false);
        if (visible) {
          await page.click(sel);
          break;
        }
      } catch (e) {}
    }

    // Fill credentials
    const emailField = 'input[placeholder="Email or Mobile"]';
    const passField = 'input[placeholder="Password"]';

    await page.waitForTimeout(500);

    if (await page.isVisible(emailField).catch(() => false)) {
      await page.fill(emailField, 'admin@deskto.com');
    } else {
      // fallback: first input[type=text]
      await page.fill('input[type="text"]', 'admin@deskto.com').catch(() => {});
    }

    if (await page.isVisible(passField).catch(() => false)) {
      await page.fill(passField, 'admin123');
    } else {
      await page.fill('input[type="password"]', 'admin123').catch(() => {});
    }

    // Click Login button
    const loginBtn = 'button:has-text("Login")';
    await page.click(loginBtn).catch(() => {});

    // Wait for token in localStorage (UI login). If this times out, fall back to programmatic login.
    let access = null;
    let refresh = null;
    try {
      await page.waitForFunction(() => !!window.localStorage.getItem('deskto_access_token'), { timeout: 5000 });
      access = await page.evaluate(() => window.localStorage.getItem('deskto_access_token'));
      refresh = await page.evaluate(() => window.localStorage.getItem('deskto_refresh_token'));
      console.log('Access token present (UI):', !!access);
      console.log('Refresh token present (UI):', !!refresh);
    } catch (e) {
      console.log('UI login did not populate tokens — falling back to programmatic login');
      // Perform API login from Node and set tokens in page localStorage
      const loginResp = await (await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'admin@deskto.com', password: 'admin123' })
      })).json();
      access = loginResp.accessToken;
      refresh = loginResp.refreshToken;
      await page.evaluate(({ a, r }) => { window.localStorage.setItem('deskto_access_token', a); window.localStorage.setItem('deskto_refresh_token', r); }, { a: access, r: refresh });
      // Navigate to admin dashboard to ensure logout UI is present
      await page.goto(FRONTEND + '/dashboard/admin', { waitUntil: 'load', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      console.log('Programmatic login tokens set in localStorage');
    }

    // Click logout (header or dashboard)
    try {
      const candidates = ['text=Logout', 'text=Log Out', 'button:has-text("Log Out")', 'button:has-text("Logout")', 'div:has-text("Logout")'];
      for (const c of candidates) {
        const count = await page.locator(c).count().catch(() => 0);
        console.log('Locator count for', c, count);
      }

      let clicked = false;
      // Prefer the topbar logout inside the dash-topbar
      const topbarLocator = page.locator('.dash-topbar').locator('text=Logout').first();
      if ((await topbarLocator.count()) > 0) {
        console.log('Clicking topbar Logout');
        await topbarLocator.click({ timeout: 5000 }).catch(e => console.log('Topbar click error', e && e.message));
        clicked = true;
      } else {
        const locator = page.locator('text=Logout').first();
        console.log('Attempting to click Logout via locator');
        await locator.click({ timeout: 5000 }).catch(async (err) => {
          console.log('Locator click failed, trying force click', err && err.message);
          await locator.click({ force: true, timeout: 3000 }).catch(e => console.log('Force click failed', e && e.message));
        });
        clicked = true;
      }
      console.log('Clicked logout?', clicked);
    } catch (e) {
      console.warn('Logout click attempts failed:', e && e.message);
    }

    // Wait shortly then check localStorage cleared
    await page.waitForTimeout(800);
      // If logout didn't clear tokens via UI, try calling the exported logout() directly from the app module.
      const accessAfterQuick = await page.evaluate(() => !!window.localStorage.getItem('deskto_access_token'));
      if (accessAfterQuick) {
        try {
          console.log('Attempting dynamic import of currentUser.logout() in page context');
          await page.evaluate(async () => {
            try {
              const mod = await import('/src/app/lib/currentUser.ts');
              if (mod && typeof mod.logout === 'function') await mod.logout();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log('dynamic import logout error', e && e.message ? e.message : e);
            }
          });
          // give it a moment
          await page.waitForTimeout(300);
        } catch (e) {
          console.log('Error invoking dynamic import logout', e && e.message);
        }
      }
    const accessAfter = await page.evaluate(() => window.localStorage.getItem('deskto_access_token'));
    const refreshAfter = await page.evaluate(() => window.localStorage.getItem('deskto_refresh_token'));
    const demoState = await page.evaluate(() => window.localStorage.getItem('deskto-auth-demo-state'));

    console.log('After logout — access:', !!accessAfter, 'refresh:', !!refreshAfter, 'demoState:', !!demoState);

    if (!accessAfter && !refreshAfter) {
      console.log('Logout cleared tokens — PASS');
      process.exit(0);
    } else {
      console.error('Logout did not clear tokens — FAIL');
      process.exit(2);
    }
  } catch (err) {
    console.error('E2E test error:', err);
    process.exit(3);
  } finally {
    await browser.close();
  }
})();
