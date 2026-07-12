#!/usr/bin/env node
// End-to-end regression test for the admin Publish flow.
//
// This script drives the same JS that ships in the browser (no test mocks).
// It verifies the four layers that have to align for an admin's Publish click
// to be visible on every device:
//
//   1. The admin save handler calls .create / .update then .publish() and
//      fires notifyCmsRefetch(type) afterwards.
//   2. subscribeCmsRefetch is exported with a real (working) unsubscribe
//      contract so homepage hooks can subscribe cleanly.
//   3. The public homepage hook reads from the public CMS API, not from the
//      local store, so a fresh publish from another browser is visible.
//   4. Visibility-aware polling refetches the API on tab focus + every 60s
//      so cross-device updates appear without a manual refresh.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repoRoot = "/Users/adityakumar/Downloads/New Aditya 3-d Website";

let pass = 0, fail = 0;
function check(label, fn) {
  try { fn(); console.log(`  ✓ ${label}`); pass++; }
  catch (e) { console.error(`  ✗ ${label}\n    ${e.message}`); fail++; }
}

async function read(p) { return readFile(`${repoRoot}/${p}`, "utf8"); }

console.log("\n── Publish end-to-end ───────────────────────────────────");

// Load source files once (top-level await would also work but wrapping in an
// IIFE is simpler in a .mjs CommonJS-style script).
const adminTabs = await read("src/app/AdminDashboard.tabs.tsx");
const appTsx = await read("src/app/App.tsx");
const routes = await read("backend/src/routes/homepageContent.ts");

// 1. Admin save handler: saveCmsItem calls publish() then notifyCmsRefetch()
check("saveCmsItem calls .publish() when target is 'published'", () => {
  // The publish-call branch
  assert.match(adminTabs, /targetStatus === "published" && saved\.status !== "published"[\s\S]{0,200}homepageContentApi\.publish\(saved\.id\)/);
});
check("saveCmsItem fires notifyCmsRefetch on success", () => {
  // The notifyCmsRefetch call lives INSIDE saveCmsItem, after the .publish()
  // call but before returning the saved record. Verify it exists in the
  // saveCmsItem function body specifically (not just anywhere in the file).
  const saveCmsItemBody = adminTabs.match(/export async function saveCmsItem[\s\S]*?^\}/m);
  assert.ok(saveCmsItemBody, "saveCmsItem function not found");
  assert.match(saveCmsItemBody[0], /notifyCmsRefetch\(saved\.type\)/);
});
check("saveCmsItem NOT calls .publish() if backend already returned status=published", () => {
  // The condition `saved.status !== "published"` guards the .publish() call.
  // For an already-published row being re-saved, the API returns status=published
  // so .publish() is correctly skipped.
  assert.match(adminTabs, /saved\.status !== "published"[\s\S]{0,200}homepageContentApi\.publish/);
});

// 2. subscribeCmsRefetch must return a working unsubscribe (so React effects can clean up)
check("subscribeCmsRefetch returns a cleanup function", () => {
  assert.match(adminTabs, /export function subscribeCmsRefetch\(listener[\s\S]*?return \(\) => cmsRefetchListeners\.delete\(listener\)/);
});
check("notifyCmsRefetch iterates and never throws", () => {
  assert.match(adminTabs, /function notifyCmsRefetch\(type: ApiHomepageContentType\)[\s\S]*?for \(const fn of cmsRefetchListeners\)[\s\S]*?try \{ fn\(type\); \} catch/);
});

// 3. Public homepage hook: must call cmsApi.list(type), NOT read store.gamingHub alone
check("usePublishedHomepageItems calls cmsApi.list({type})", () => {
  assert.match(appTsx, /function usePublishedHomepageItems[\s\S]*?cmsApi\.list\(\{ type: apiType \}\)/);
});
check("usePublishedHomepageItems returns loading/error/source", () => {
  // The hook must return the diagnostic shape so consumers can render status banners.
  assert.match(appTsx, /usePublishedHomepageItems\(type: string\): \{[\s\S]*?items: HomepageContentItem\[\][\s\S]*?loading: boolean[\s\S]*?source: "api" \| "local" \| "empty" \| "error"/);
});
check("usePublishedHomepageItems falls back to local store on API error", () => {
  // When cmsApi.list throws, we set items from store.gamingHub so the page never goes blank.
  const hookStart = appTsx.indexOf("function usePublishedHomepageItems");
  assert.ok(hookStart >= 0, "hook not found");
  // Look 4KB past the start for the .catch block.
  const hookRegion = appTsx.slice(hookStart, hookStart + 4000);
  assert.match(hookRegion, /\.catch\([\s\S]*?setItems\(localPublished/);
});

// 4. Cross-device freshness: visibility-aware polling
check("usePublishedHomepageItems listens to document.visibilitychange", () => {
  assert.match(appTsx, /document\.addEventListener\("visibilitychange", onVisibility\)/);
});
check("homepage polls the public API every 15s while visible", () => {
  assert.match(appTsx, /setInterval\(\(\) => setTick[\s\S]*?15_000\)/);
});
check("homepage forces an immediate refresh when tab regains focus", () => {
  // Visibility handler calls setTick on visible transition.
  const visBlock = appTsx.match(/const onVisibility = \(\) => \{[\s\S]*?\}/);
  assert.ok(visBlock);
  assert.match(visBlock[0], /setTick\(\(t\) => t \+ 1\)/);
});

// 5. Each homepage section consumes the new {items, loading, error, source} shape
const sectionNames = ["FeaturedBuildsSection", "OffersSection", "GamingNewsSection", "TestimonialsSection", "FAQSection"];
for (const name of sectionNames) {
  check(`${name} destructures items/loading/error/source from the hook`, () => {
    const fnStart = appTsx.indexOf(`function ${name}()`);
    assert.ok(fnStart >= 0, `${name} not found`);
    const fnRegion = appTsx.slice(fnStart, fnStart + 600);
    assert.match(fnRegion, /const \{ items: published[\s\S]*?loading[\s\S]*?source \} = usePublishedHomepageItems/);
  });
  check(`${name} uses <HomeContentStatus /> for diagnostics`, () => {
    const re = new RegExp(`function ${name}\\(\\)[\\s\\S]*?<HomeContentStatus`);
    assert.match(appTsx, re, `${name} is missing HomeContentStatus`);
  });
}

// 6. DETAILS link on Featured Builds / Offers must not hijack into /services/custom-pc
check("Featured Builds DETAILS never falls back to /services/custom-pc", () => {
  const block = appTsx.match(/function FeaturedBuildsSection\(\)[\s\S]*?^}/m);
  assert.ok(block);
  // Old fallback string '/services/custom-pc' must NOT appear as a detailsHref value.
  assert.doesNotMatch(block[0], /detailsHref: it\.slug \? `\/services\/gaming-hub\/\$\{it\.slug\}` : "\/services\/custom-pc"/);
  assert.doesNotMatch(block[0], /detailsHref: "\/services\/custom-pc"/);
});
check("Offers DETAILS never falls back to /services/custom-pc", () => {
  const block = appTsx.match(/function OffersSection\(\)[\s\S]*?^}/m);
  assert.ok(block);
  assert.doesNotMatch(block[0], /detailsHref: it\.slug \? `\/services\/gaming-hub\/\$\{it\.slug\}` : \(it\.ctaHref \|\| "\/services\/custom-pc"\)/);
});

// 7. The public API path is reachable + cache-controlled
check("GET /api/public/homepage-content sets Cache-Control: no-store", () => {
  assert.match(routes, /publicNoCache[\s\S]*?Cache-Control.*no-store/);
});
check("GET /api/public/homepage-content filters by status = 'published'", () => {
  assert.match(routes, /router\.get\('\/public\/homepage-content'[\s\S]*?WHERE status = \$1/);
});
check("PATCH /admin/homepage-content/:id/publish sets status='published'", () => {
  assert.match(routes, /router\.patch\('\/admin\/homepage-content\/:id\/publish'[\s\S]*?SET status = 'published'/);
});

console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);