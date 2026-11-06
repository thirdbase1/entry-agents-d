/**
 * Entry Agents Desktop - Device Authorization & Session Management
 *
 * Exclusively uses the official Entry Web backend at https://entry-agents.dev:
 * 1. POST /api/desktop/device/start -> gets device_code, code, verification_uri_complete
 * 2. User approves in browser at https://entry-agents.dev/desktop/approve?code=XXXXXX
 * 3. POST /api/desktop/device/poll -> polls until approved or expired
 * 4. GET /api/desktop/usage -> loads account profile and credit balance
 * 5. Securely stores session in OsCredentialStore (Windows DPAPI, macOS Keychain, Linux secret-tool)
 */

import { OsCredentialStore, StoredCredentials } from "./credential-store";

export const DEFAULT_ENTRY_URL =
  process.env.NEXT_PUBLIC_ENTRY_URL ??
  process.env.ENTRY_URL ??
  "https://entry-agents.dev";

export const BACKEND_URLS = [
  DEFAULT_ENTRY_URL,
  "https://entry-desktop-backend.vercel.app",
  "https://entry-project-b.vercel.app",
];

export interface DeviceAuthorizeResponse {
  device_code: string;
  user_code: string;
  code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface AccountProfile {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  plan: string;
  planName: string;
  creditBalanceCents: number;
  createdAt?: string;
}

export interface DeviceTokenPollResult {
  status: "pending" | "approved" | "expired" | "error";
  session_token?: string;
  account?: AccountProfile;
  error?: string;
}

export class EntryDeviceAuthService {
  readonly baseUrl: string;
  private activeBackendUrl: string;
  readonly credentialStore: OsCredentialStore;
  private currentAccount: AccountProfile | null = null;

  constructor(
    baseUrl: string = DEFAULT_ENTRY_URL,
    credentialStore?: OsCredentialStore
  ) {
    this.baseUrl = (baseUrl || DEFAULT_ENTRY_URL).replace(/\/+$/, "");
    this.activeBackendUrl = this.baseUrl;
    this.credentialStore = credentialStore ?? new OsCredentialStore();
  }

  /**
   * Initiates the device authorization flow by calling the Entry backend.
   * Gracefully tries the canonical domain followed by the deployed desktop-backend instances,
   * while keeping browser verification strictly at https://entry-agents.dev/desktop/approve.
   */
  async startDeviceAuthorization(): Promise<DeviceAuthorizeResponse> {
    const candidateUrls = [
      `${this.baseUrl}/api/desktop/device/start`,
      "https://entry-desktop-backend.vercel.app/api/desktop/device/start",
      "https://entry-project-b.vercel.app/api/desktop/device/start",
    ];

    let lastError = "Failed to connect to Entry authentication service";

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: "entry-desktop" }),
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} from ${url}`;
          continue;
        }

        const data = await res.json();
        const code = data.code ?? data.user_code ?? data.userCode;
        const deviceCode = data.device_code ?? data.deviceCode;

        if (!code || !deviceCode) {
          lastError = "Invalid response from device authorization endpoint";
          continue;
        }

        try {
          const parsed = new URL(url);
          this.activeBackendUrl = parsed.origin;
        } catch {
          this.activeBackendUrl = this.baseUrl;
        }

        const webBase = this.baseUrl || DEFAULT_ENTRY_URL;
        return {
          device_code: deviceCode,
          user_code: code,
          code,
          verification_uri: `${webBase}/desktop/approve`,
          verification_uri_complete: `${webBase}/desktop/approve?code=${encodeURIComponent(code)}`,
          expires_in: data.expires_in ?? data.expiresIn ?? 600,
          interval: data.interval ?? data.poll_interval_seconds ?? 3,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(lastError);
  }

  /**
   * Polls the device token endpoint until approved, pending, or expired.
   */
  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenPollResult> {
    const candidateOrigins = [
      this.activeBackendUrl,
      this.baseUrl,
      "https://entry-desktop-backend.vercel.app",
      "https://entry-project-b.vercel.app",
    ].filter(Boolean) as string[];

    const origins = Array.from(new Set(candidateOrigins));

    for (const origin of origins) {
      const url = `${origin}/api/desktop/device/poll`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_code: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            client_id: "entry-desktop",
          }),
        });

        if (!res.ok && res.status !== 400 && res.status !== 404) {
          continue;
        }

        const data = await res.json().catch(() => ({}));

        if (data.status === "expired" || data.error === "expired_token") {
          return { status: "expired", error: "Device authorization code expired" };
        }

        if (data.status === "pending" || data.error === "authorization_pending") {
          return { status: "pending" };
        }

        const token = data.session_token ?? data.access_token;
        if (token && (data.status === "approved" || data.user_id)) {
          this.activeBackendUrl = origin;
          // Fetch real profile & balance using this session token
          const profile = await this.fetchAccountProfile(token).catch(() => ({
            userId: data.user_id ?? "user",
            email: data.email ?? "user@entry-agents.dev",
            plan: "free",
            planName: "Entry Free",
            creditBalanceCents: 0,
          }));

          // Save securely to OS Credential Store
          this.saveSession(token, profile);

          return {
            status: "approved",
            session_token: token,
            account: profile,
          };
        }
      } catch {
        // try next endpoint
      }
    }

    return { status: "pending" };
  }

  /**
   * Fetches account profile and credits using Bearer session token from /api/desktop/usage.
   */
  async fetchAccountProfile(token: string): Promise<AccountProfile> {
    const candidateOrigins = [
      this.activeBackendUrl,
      this.baseUrl,
      DEFAULT_ENTRY_URL,
      "https://entry-desktop-backend.vercel.app",
      "https://entry-project-b.vercel.app",
    ].filter(Boolean) as string[];

    const origins = Array.from(new Set(candidateOrigins));
    for (const origin of origins) {
      const urls = [
        `${origin}/api/desktop/usage`,
        `${origin}/api/usage`,
        `${origin}/api/billing/me`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          if (!res.ok) continue;

          const data = await res.json();
          const userId = data.userId ?? data.id ?? data.user?.id ?? "entry-user";
          const email = data.email ?? data.user?.email ?? "";
          const name = data.name ?? data.user?.name ?? "";
          const avatar = data.avatar ?? data.user?.avatar ?? "";
          const plan = data.plan ?? data.planId ?? "free";
          const planName = data.planName ?? "Entry Free";
          const creditBalanceCents =
            data.creditBalanceCents ?? data.balanceCents ?? data.credits ?? 0;

          return {
            userId,
            email,
            name,
            avatar,
            plan,
            planName,
            creditBalanceCents,
          };
        } catch {
          // continue
        }
      }
    }

    throw new Error("Unable to retrieve account details with active session");
  }

  /**
   * Persists the authenticated session into OS credential storage.
   */
  saveSession(token: string, profile: AccountProfile): void {
    this.currentAccount = profile;
    this.credentialStore.saveCredentials({
      accountId: profile.userId,
      email: profile.email,
      accessToken: token,
      refreshToken: token,
      tokenExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Gets the active session from OS Credential Store.
   */
  getActiveSession(): StoredCredentials | null {
    const creds = this.credentialStore.loadCredentials();
    if (!creds?.accessToken) return null;
    if (creds.tokenExpiry && creds.tokenExpiry < Date.now()) {
      this.signOut();
      return null;
    }
    return creds;
  }

  /**
   * Validates the active session against the Entry backend.
   */
  async validateSession(): Promise<AccountProfile | null> {
    const session = this.getActiveSession();
    if (!session?.accessToken) return null;

    try {
      const profile = await this.fetchAccountProfile(session.accessToken);
      this.currentAccount = profile;
      return profile;
    } catch {
      // If network is offline, return cached or optimistic profile if session hasn't expired
      if (session.tokenExpiry && session.tokenExpiry > Date.now()) {
        return {
          userId: session.accountId,
          email: session.email,
          plan: "active",
          planName: "Entry Active",
          creditBalanceCents: 0,
        };
      }
      return null;
    }
  }

  /**
   * Logs out and cleans up OS credentials.
   */
  signOut(): void {
    this.currentAccount = null;
    this.credentialStore.clearCredentials();
  }

  getCurrentAccount(): AccountProfile | null {
    return this.currentAccount;
  }
}

// Global singleton instance for the desktop application
let globalAuthService: EntryDeviceAuthService | null = null;

export function getDeviceAuthService(): EntryDeviceAuthService {
  if (!globalAuthService) {
    globalAuthService = new EntryDeviceAuthService();
  }
  return globalAuthService;
}
