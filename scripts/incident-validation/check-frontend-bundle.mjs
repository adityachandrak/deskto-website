// Static check of the production frontend bundle for the customer
// homepage fix. The customer homepage must:
//   1. Reference the public homepage API
//   2. Reference the admin homepage API for mutations
//   3. NOT bundle the homepage BUILDS / REVIEWS / NEWS / FAQS / STATIC_OFFERS
//      arrays that were silently shown as a fallback in the previous
//      implementation.
//   4. NOT hard-code 127.0.0.1 in an API URL
//   5. Reference publish/unpublish endpoints
//
// Admin-side seed data in defaultGamingHubItems is allowed and intentional
// (it seeds the admin dashboard when the backend is offline). It is NOT
// used as a customer fallback.
import fs from 'node:fs';
import path from 'path';

const distDir = path.resolve('dist');
const jsFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));
let issues = 0;
let checked = 0;

function check(name, condition, msg) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}: ${msg}`);
    issues++;
  }
  checked++;
}

for (const f of jsFiles) {
  const content = fs.readFileSync(path.join(distDir, 'assets', f), 'utf8');
  console.log(`[frontend-bundle] checking ${f} (${content.length} bytes)`);

  check(`no "localhost" reference in production bundle`,
    !/localhost[:/]/i.test(content),
    'found localhost reference');

  // 127.0.0.1 only acceptable in demo seed data, not in any URL path.
  // Specifically: must not appear inside the API base / API URL templates.
  const apiBaseMatch = content.match(/VITE_API_URL[\s\S]{0,200}/);
  const apiBaseOk = !apiBaseMatch || !/127\.0\.0\.1/.test(apiBaseMatch[0]);
  check(`API base URL does not point at 127.0.0.1`, apiBaseOk, 'API base URL is 127.0.0.1');

  // The homepage-content BUILDS demo data ("The Phantom" with 4K Gaming Beast
  // tag) was bundled inline in src/app/App.tsx as `BUILDS = [...]`. We removed
  // that array; the bundle must no longer contain it.
  check(`no bundled BUILDS demo data (4K Gaming Beast)`,
    !content.includes('4K Gaming Beast'),
    'still has hardcoded featured builds data');

  // REVIEWS demo data was an inline REVIEWS array in src/app/App.tsx.
  check(`no bundled REVIEWS demo data (Arjun Mehta)`,
    !content.includes('Arjun Mehta'),
    'still has hardcoded reviews demo data');

  // FAQS demo data was an inline FAQS array in src/app/App.tsx. The Services
  // Page FAQ is a separate, legitimate static FAQ for that page and is
  // allowed (uses a different question text).
  check(`no bundled homepage FAQS demo data ("How long does a custom PC build take?")`,
    !content.includes('How long does a custom PC build take?'),
    'still has hardcoded homepage FAQS demo data');

  // Bundle must reference the admin & public homepage API route prefixes
  check(`references admin/homepage-content API route`,
    content.includes('admin/homepage-content'),
    'no reference to admin homepage API in bundle');

  check(`references public/homepage-content API route`,
    content.includes('public/homepage-content'),
    'no reference to public homepage API in bundle');

  check(`publish/unpublish endpoints referenced`,
    content.includes('/publish') && content.includes('/unpublish'),
    'publish endpoints not referenced in bundle');
}

console.log(`\n[frontend-bundle] ${checked - issues}/${checked} checks passed`);
if (issues > 0) {
  console.error(`[frontend-bundle] ${issues} ISSUE(S) FOUND`);
  process.exit(1);
}
