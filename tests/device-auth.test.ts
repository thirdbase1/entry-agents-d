import test from "node:test";
import assert from "node:assert/strict";
import { OsCredentialStore } from "../lib/auth/credential-store";
import { EntryDeviceAuthService } from "../lib/auth/device-auth";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";

test("OS Credential Store securely persists, retrieves, and clears credentials", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "entry-auth-test-"));
  try {
    const store = new OsCredentialStore(tempDir);

    // Initial state is null
    assert.equal(store.loadCredentials(), null);

    const testCreds = {
      accountId: "usr_test123",
      email: "engineer@entry-agents.dev",
      accessToken: "entry_live_tok_998877",
      refreshToken: "entry_live_ref_998877",
      tokenExpiry: Date.now() + 3600 * 1000,
      baseUrl: "https://entry-agents.dev",
    };

    store.saveCredentials(testCreds);

    const loaded = store.loadCredentials();
    assert.ok(loaded);
    assert.equal(loaded?.accountId, "usr_test123");
    assert.equal(loaded?.email, "engineer@entry-agents.dev");
    assert.equal(loaded?.accessToken, "entry_live_tok_998877");
    assert.equal(loaded?.baseUrl, "https://entry-agents.dev");

    // Clear credentials
    store.clearCredentials();
    assert.equal(store.loadCredentials(), null);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test("EntryDeviceAuthService handles active session state correctly", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "entry-service-test-"));
  try {
    const store = new OsCredentialStore(tempDir);
    const service = new EntryDeviceAuthService("https://entry-agents.dev", store);

    assert.equal(service.getActiveSession(), null);

    service.saveSession("tok_abc123", {
      userId: "usr_agent",
      email: "agent@entry-agents.dev",
      plan: "pro",
      planName: "Entry Pro",
      creditBalanceCents: 5000,
    });

    const session = service.getActiveSession();
    assert.ok(session);
    assert.equal(session?.accessToken, "tok_abc123");
    assert.equal(session?.accountId, "usr_agent");

    service.signOut();
    assert.equal(service.getActiveSession(), null);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});
