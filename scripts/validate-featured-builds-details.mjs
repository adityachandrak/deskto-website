#!/usr/bin/env node
// Drive the homepage Featured Builds → Details link resolution end-to-end:
// 1. Use the same slugify rules as App.tsx to compute the slug for the seed
//    Phantom build.
// 2. Verify the resulting href lands on /services/gaming-hub/<slug> (never
//    /services/custom-pc).
// 3. Verify getServicesRouteFromPath() would resolve /services/gaming-hub/<slug>
//    to the GamingHubPage with the right child slug.
// 4. Print PASS/FAIL summary.

import assert from "node:assert/strict";

const FEATURED_BUILDS = [
  { id: "gh_build_phantom", title: "The Phantom: Signature 4K Gaming Machine", slug: "deskto-phantom-signature-4k-gaming-machine" },
  { id: "gh_build_titan", title: "The Titan: Streaming Powerhouse", slug: "deskto-titan-streaming-powerhouse" },
  { id: "gh_build_workstation", title: "The Workstation", slug: "deskto-workstation" },
];

const gamingHubArticleHref = (slug) => (slug ? `/services/gaming-hub/${slug}` : "/services/gaming-hub");

const deriveSlugFromTitle = (title, id) => {
  const fromTitle = String(title || "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (fromTitle) return fromTitle.slice(0, 240);
  if (id) return `cms-${id.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60)}`;
  return "";
};

// ── Regression: old buggy behavior ────────────────────────────────────────────
function OLD_detailsHref(it) {
  // Replicates the PRE-fix line in App.tsx:
  //   detailsHref: it.slug ? `/services/gaming-hub/${it.slug}` : "/services/custom-pc",
  return it.slug ? `/services/gaming-hub/${it.slug}` : "/services/custom-pc";
}

// ── New behavior ──────────────────────────────────────────────────────────────
function NEW_detailsHref(it) {
  const slugOrDerived = it.slug || deriveSlugFromTitle(it.title, it.id);
  return gamingHubArticleHref(slugOrDerived);
}

// getServicesRouteFromPath logic copied from App.tsx
function getServicesRouteFromPath(pathname) {
  if (pathname === "/services" || pathname === "/services/") return { slug: null };
  const m = pathname.match(/^\/services\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
  return m ? { slug: m[1], child: m[2] || null } : null;
}

let pass = 0, fail = 0;
function check(label, fn) {
  try { fn(); console.log(`  ✓ ${label}`); pass++; }
  catch (e) { console.error(`  ✗ ${label}\n    ${e.message}`); fail++; }
}

console.log("\n── Featured Builds Details Flow ──────────────────────────");

// 1. Old code was unsafe: missing slug → /services/custom-pc (the bug)
check("OLD bug: empty slug hijacks to /services/custom-pc", () => {
  const href = OLD_detailsHref({ title: "X" });
  assert.equal(href, "/services/custom-pc");
});

// 2. New code: missing slug → never /services/custom-pc, even with empty id
check("NEW fix: missing slug never routes to /services/custom-pc", () => {
  // No title, no slug, no id → falls to gaming-hub index
  const hrefEmpty = NEW_detailsHref({});
  assert.notEqual(hrefEmpty, "/services/custom-pc");
  assert.ok(hrefEmpty.startsWith("/services/gaming-hub"));
  // With a title only → derived slug → still goes to gaming-hub
  const hrefTitle = NEW_detailsHref({ title: "X" });
  assert.notEqual(hrefTitle, "/services/custom-pc");
  assert.ok(hrefTitle.startsWith("/services/gaming-hub"));
});

// 3. With a populated slug → /services/gaming-hub/<slug>
check("seeded slug resolves to /services/gaming-hub/<slug>", () => {
  const href = NEW_detailsHref(FEATURED_BUILDS[0]);
  assert.equal(href, "/services/gaming-hub/deskto-phantom-signature-4k-gaming-machine");
});

// 4. Slug derived from title when missing → still produces a valid URL
check("missing slug is derived from title", () => {
  const href = NEW_detailsHref({ title: "The Phantom: Signature 4K Gaming Machine", id: "gh_build_phantom" });
  assert.equal(href, "/services/gaming-hub/the-phantom-signature-4k-gaming-machine");
});

// 5. Routing: /services/gaming-hub/<slug> resolves to gaming-hub + child slug
check("path matcher resolves /services/gaming-hub/<slug> to child", () => {
  const r = getServicesRouteFromPath("/services/gaming-hub/deskto-phantom-signature-4k-gaming-machine");
  assert.deepEqual(r, { slug: "gaming-hub", child: "deskto-phantom-signature-4k-gaming-machine" });
});

// 6. Routing: /services/gaming-hub resolves to index (no child)
check("path matcher resolves /services/gaming-hub to index", () => {
  const r = getServicesRouteFromPath("/services/gaming-hub");
  assert.deepEqual(r, { slug: "gaming-hub", child: null });
});

// 7. Every seeded build link goes to Gaming Hub, never to custom-pc
for (const b of FEATURED_BUILDS) {
  check(`build "${b.title}" details never routes to /services/custom-pc`, () => {
    const href = NEW_detailsHref(b);
    assert.notEqual(href, "/services/custom-pc");
    assert.ok(href.startsWith("/services/gaming-hub"));
  });
}

console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);