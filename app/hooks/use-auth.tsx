"use client";

import * as React from "react";
import type { AccountProfile, DeviceAuthorizeResponse } from "@/lib/auth/device-auth";

export type AuthStatus =
  | "initializing"
  | "signed_out"
  | "signing_in"
  | "awaiting_approval"
  | "authenticated"
  | "session_expired"
  | "connection_error";

interface AuthContextValue {
  status: AuthStatus;
  user: AccountProfile | null;
  deviceCode: string | null;
  userCode: string | null;
  verificationUri: string | null;
  error: string | null;
  signIn: () => Promise<void>;
  cancelSignIn: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("initializing");
  const [user, setUser] = React.useState<AccountProfile | null>(null);
  const [deviceCode, setDeviceCode] = React.useState<string | null>(null);
  const [userCode, setUserCode] = React.useState<string | null>(null);
  const [verificationUri, setVerificationUri] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearPolling = React.useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const checkSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setStatus("signed_out");
        return;
      }
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("signed_out");
      }
    } catch {
      setStatus("signed_out");
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void checkSession();
    }, 0);
    return () => {
      clearTimeout(timer);
      clearPolling();
    };
  }, [checkSession, clearPolling]);

  const poll = React.useCallback(
    async (code: string) => {
      try {
        const res = await fetch("/api/auth/device/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: code }),
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "approved" && data.account) {
          clearPolling();
          setUser(data.account);
          setStatus("authenticated");
          setError(null);
        } else if (data.status === "expired") {
          clearPolling();
          setStatus("session_expired");
          setError("Verification code expired. Please try again.");
        }
      } catch {
        // network flicker, keep polling until timeout
      }
    },
    [clearPolling]
  );

  const signIn = React.useCallback(async () => {
    clearPolling();
    setStatus("signing_in");
    setError(null);

    try {
      const res = await fetch("/api/auth/device/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("connection_error");
        setError(err.error || "Failed to initiate device authentication");
        return;
      }

      const data: DeviceAuthorizeResponse = await res.json();
      setDeviceCode(data.device_code);
      setUserCode(data.user_code || data.code);
      setVerificationUri(data.verification_uri_complete);
      setStatus("awaiting_approval");

      // Open approval page in the system browser
      const approveUrl = data.verification_uri_complete;
      if (typeof window !== "undefined") {
        try {
          window.open(approveUrl, "_blank");
        } catch {
          // ignore
        }
      }

      // Begin polling every interval seconds (default 3s)
      const intervalSec = Math.max(2, data.interval || 3);
      pollTimerRef.current = setInterval(() => {
        poll(data.device_code);
      }, intervalSec * 1000);
    } catch (err) {
      setStatus("connection_error");
      setError((err as Error).message || "Network error");
    }
  }, [clearPolling, poll]);

  const cancelSignIn = React.useCallback(() => {
    clearPolling();
    setDeviceCode(null);
    setUserCode(null);
    setVerificationUri(null);
    setError(null);
    setStatus("signed_out");
  }, [clearPolling]);

  const signOut = React.useCallback(async () => {
    clearPolling();
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setUser(null);
    setStatus("signed_out");
  }, [clearPolling]);

  const refreshProfile = React.useCallback(async () => {
    await checkSession();
  }, [checkSession]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        deviceCode,
        userCode,
        verificationUri,
        error,
        signIn,
        cancelSignIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
