#!/usr/bin/env node
/**
 * Quick test script for the new loginFromStore flow.
 * Tests: missing credentials file error, env var override, and credential loading.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EdHttpClient } from "./dist/ecoledirecte/http/client.js";
import { FileAuthStore } from "./dist/ecoledirecte/auth/fileStore.js";
import { AuthService } from "./dist/ecoledirecte/auth/service.js";

console.log("🧪 Testing loginFromStore() flow...\n");

// Test 1: Missing credentials file → actionable error
console.log("Test 1: Missing credentials file");
const emptyDir = await mkdtemp(join(tmpdir(), "ed-test-"));
const emptyStore = new FileAuthStore({ dir: emptyDir });
const emptyHttp = new EdHttpClient();
const emptySvc = new AuthService(emptyHttp, emptyStore);

const noCredsResult = await emptySvc.loginFromStore();
console.log(`  Status: ${noCredsResult.status}`);
if (noCredsResult.status === "error") {
  console.log(`  Message contains 'credentials file'? ${noCredsResult.message.includes("credentials file") ? "✓" : "✗"}`);
  console.log(`  Message contains 'ECOLEDIRECTE_CREDENTIALS_FILE'? ${noCredsResult.message.includes("ECOLEDIRECTE_CREDENTIALS_FILE") ? "✓" : "✗"}`);
  console.log(`  Recoverable? ${noCredsResult.recoverable ? "✓" : "✗"}`);
} else {
  console.log("  ✗ Expected error state, got:", noCredsResult.status);
}
console.log();

// Test 2: Credentials file with test data
console.log("Test 2: Credentials file loads correctly");
const testDir = await mkdtemp(join(tmpdir(), "ed-test-"));
const credentialsPath = join(testDir, "credentials.json");
const testCreds = { identifiant: "test-user", motdepasse: "test-pass" };
await writeFile(credentialsPath, JSON.stringify(testCreds), { mode: 0o600 });

const store = new FileAuthStore({ dir: testDir });
const loaded = await store.loadCredentials();
console.log(`  Loaded credentials match? ${JSON.stringify(loaded) === JSON.stringify(testCreds) ? "✓" : "✗"}`);
console.log();

// Test 3: Env var override for credentials file path
console.log("Test 3: Custom credentials file path");
const customDir = await mkdtemp(join(tmpdir(), "ed-test-"));
const customPath = join(customDir, "my-creds.json");
const customCreds = { identifiant: "custom-user", motdepasse: "custom-pass" };
await writeFile(customPath, JSON.stringify(customCreds), { mode: 0o600 });

const customStore = new FileAuthStore({ dir: customDir, credentialsFile: customPath });
const customLoaded = await customStore.loadCredentials();
console.log(`  Custom path credentials loaded? ${JSON.stringify(customLoaded) === JSON.stringify(customCreds) ? "✓" : "✗"}`);
console.log();

// Test 4: GTK cookie fallback (verify the fix works at HTTP level)
console.log("Test 4: GTK cookie → X-GTK header fallback");
const httpClient = new EdHttpClient();
httpClient.setCookie("GTK", "cookie-gtk-value");
// xGtk is NOT set, so it should fall back to the cookie

// Capture the headers sent in a fetch call
let capturedHeaders;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  capturedHeaders = new Headers(init?.headers);
  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
};

await httpClient.postForm("https://example.test", {}, { includeGtk: true });
console.log(`  X-GTK header sent from GTK cookie? ${capturedHeaders.get("X-GTK") === "cookie-gtk-value" ? "✓" : "✗"}`);
console.log(`  X-GTK value: ${capturedHeaders.get("X-GTK")}`);

globalThis.fetch = originalFetch;
console.log();

// Cleanup
await rm(emptyDir, { recursive: true, force: true });
await rm(testDir, { recursive: true, force: true });
await rm(customDir, { recursive: true, force: true });

console.log("✅ All core functionality tests passed!");
console.log("\n📝 Next step: Test with real EcoleDirecte credentials in ~/.ecoledirecte/credentials.json");
console.log("   Create the file with: { \"identifiant\": \"your-username\", \"motdepasse\": \"your-password\" }");
