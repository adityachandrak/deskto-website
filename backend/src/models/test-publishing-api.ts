import { query } from "../config/database";


const API_BASE = "http://localhost:3003/api";



async function runTests() {
  console.log("=== STARTING INTEGRATION TESTS FOR CONFIG API ===");

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Get Admin and Customer JWT Tokens via Login
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔑 Logging in Admin...");
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin@deskto.com", password: "admin123" }),
    });
    if (!adminLoginRes.ok) throw new Error("Admin login failed");
    const adminData = await adminLoginRes.json() as any;
    const adminToken = adminData.token || adminData.accessToken;
    console.log("✅ Admin token acquired.");

    console.log("\n🔑 Logging in Customer...");
    const customerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "test4@gmail.com", password: "admin123" }),
    });
    if (!customerLoginRes.ok) throw new Error("Customer login failed");
    const customerData = await customerLoginRes.json() as any;
    const customerToken = customerData.token || customerData.accessToken;


    console.log("✅ Customer token acquired.");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Test Public Endpoint GET /api/config
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🌐 Fetching public configuration...");
    const publicConfigRes = await fetch(`${API_BASE}/config`);
    if (!publicConfigRes.ok) throw new Error("Failed to fetch public config");
    const publicConfig = await publicConfigRes.json() as any;
    console.log("✅ Public configuration retrieved.");
    console.log(`- Site Name: ${publicConfig.config.site.name}`);
    console.log(`- Version: ${publicConfig.version}`);
    console.log(`- Cache-Control Header: ${publicConfigRes.headers.get("cache-control")}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Test Unauthorized Publishing (PUT draft as customer)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔒 Testing unauthorized draft update (should fail)...");
    const unauthorizedPutRes = await fetch(`${API_BASE}/admin/config/draft`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        configData: {
          site: { name: "HACKED NAME" }
        }
      }),
    });
    console.log(`Status returned: ${unauthorizedPutRes.status}`);
    if (unauthorizedPutRes.status === 403) {
      console.log("✅ PASS: Correctly blocked unauthorized customer role (403 Forbidden).");
    } else {
      throw new Error(`FAIL: Expected 403, got ${unauthorizedPutRes.status}`);
    }

    // 🔒 Testing publish as customer
    console.log("\n🔒 Testing unauthorized publish request (should fail)...");
    const unauthorizedPublishRes = await fetch(`${API_BASE}/admin/config/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${customerToken}`,
      },
    });
    console.log(`Status returned: ${unauthorizedPublishRes.status}`);
    if (unauthorizedPublishRes.status === 403) {
      console.log("✅ PASS: Correctly blocked unauthorized customer publishing (403 Forbidden).");
    } else {
      throw new Error(`FAIL: Expected 403, got ${unauthorizedPublishRes.status}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Test Malformed Configuration (Invalid color format & section type)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n📝 Testing malformed config update (should fail)...");
    
    // Test invalid hex color
    const malformedColorRes = await fetch(`${API_BASE}/admin/config/draft`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        configData: {
          theme: { primaryColor: "red" } // Bad hex color
        }
      }),
    });
    const colorError = await malformedColorRes.json() as any;
    console.log(`Status: ${malformedColorRes.status}, Error: ${colorError.error}`);
    if (malformedColorRes.status === 400 && colorError.error.includes("Invalid color format")) {
      console.log("✅ PASS: Malformed color format correctly rejected (400 Bad Request).");
    } else {
      throw new Error(`FAIL: Expected color rejection, got ${malformedColorRes.status}`);
    }

    // Test invalid sectionId
    const malformedSectionRes = await fetch(`${API_BASE}/admin/config/draft`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        configData: {
          homepageLayout: [
            { sectionId: "malicious-xss-script", enabled: true, displayOrder: 0 }
          ]
        }
      }),
    });
    const sectionError = await malformedSectionRes.json() as any;
    console.log(`Status: ${malformedSectionRes.status}, Error: ${sectionError.error}`);
    if (malformedSectionRes.status === 400 && sectionError.error.includes("Invalid layout sectionId")) {
      console.log("✅ PASS: Invalid homepage sectionId correctly rejected (400 Bad Request).");
    } else {
      throw new Error(`FAIL: Expected section whitelist rejection, got ${malformedSectionRes.status}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Test Draft Privacy (Updates draft, verifies public config unchanged)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n📝 Saving a valid new draft as Admin...");
    const nextConfig = {
      ...publicConfig.config,
      site: {
        ...publicConfig.config.site,
        name: "DESKTO Integration Test Platform"
      }
    };

    const saveDraftRes = await fetch(`${API_BASE}/admin/config/draft`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ configData: nextConfig }),
    });
    if (!saveDraftRes.ok) throw new Error("Failed to save draft");
    console.log("✅ Draft configuration saved successfully.");

    console.log("\n🕵️ Checking public config to verify draft privacy...");
    const verifyPublicRes = await fetch(`${API_BASE}/config`);
    const verifyPublic = await verifyPublicRes.json() as any;
    console.log(`Public Site Name is: "${verifyPublic.config.site.name}"`);
    if (verifyPublic.config.site.name === "DESKTO") {
      console.log("✅ PASS: Draft content is NOT visible to the public API.");
    } else {
      throw new Error(`FAIL: Public API exposed the draft site name: "${verifyPublic.config.site.name}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Test Publishing
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🚀 Publishing draft as Admin...");
    const publishRes = await fetch(`${API_BASE}/admin/config/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
      },
    });
    if (!publishRes.ok) throw new Error(`Publish failed with status ${publishRes.status}`);
    const publishResult = await publishRes.json() as any;
    console.log(`✅ Publish successful. New published version: ${publishResult.version}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Verify Public Config is Updated
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🌐 Fetching public configuration again...");
    const updatedConfigRes = await fetch(`${API_BASE}/config`);
    const updatedConfig = await updatedConfigRes.json() as any;
    console.log(`New Public Site Name: "${updatedConfig.config.site.name}"`);
    if (updatedConfig.config.site.name === "DESKTO Integration Test Platform" && updatedConfig.version === publishResult.version) {
      console.log("✅ PASS: Public API returns the newly published configuration.");
    } else {
      throw new Error(`FAIL: Expected site name to update, but got "${updatedConfig.config.site.name}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Verify Database Audit Logs
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n📊 Verifying database audit log generation...");
    const logResult = await query(
      `SELECT action, old_values, new_values FROM audit_logs 
       WHERE action = 'publish_site_config' 
       ORDER BY created_at DESC LIMIT 1`
    );
    if (logResult.rows.length === 0) throw new Error("No audit log entry created");
    const log = logResult.rows[0];
    console.log(`✅ PASS: Audit log successfully generated for action: "${log.action}"`);
    console.log(`- Old values included: ${log.old_values ? "Yes" : "No"}`);
    console.log(`- New values included: ${log.new_values ? "Yes" : "No"}`);

    console.log("\n🎉 ALL CONFIG API INTEGRATION TESTS PASSED!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test Suite Failed:", error.message);
    process.exit(1);
  }
}

runTests();
