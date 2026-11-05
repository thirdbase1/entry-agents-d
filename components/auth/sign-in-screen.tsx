"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/app/hooks/use-auth";
import { Loader2, ExternalLink, AlertCircle, RefreshCw, XCircle } from "lucide-react";

export function SignInScreen() {
  const {
    status,
    userCode,
    verificationUri,
    error,
    signIn,
    cancelSignIn,
  } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0d] text-zinc-100 p-6 select-none">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#141416] p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Entry Logo */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-inner">
          <Image
            src="/icon.png"
            alt="Entry Agents"
            width={40}
            height={40}
            className="rounded-lg object-contain"
            priority
          />
        </div>

        {/* Header */}
        <h1 className="text-xl font-semibold tracking-tight text-white mb-2">
          Entry Agents Desktop
        </h1>
        <p className="text-sm text-zinc-400 mb-8 max-w-xs leading-relaxed">
          Autonomous AI software engineering client powered directly by Entry Agents.
        </p>

        {/* State: Awaiting Browser Approval */}
        {status === "awaiting_approval" && (
          <div className="w-full flex flex-col items-center gap-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 w-full">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-medium">
                Verification Code
              </span>
              <div className="mt-1 text-3xl font-mono font-bold tracking-widest text-emerald-300">
                {userCode || "••••••"}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Waiting for approval in your browser...</span>
            </div>

            <div className="flex w-full flex-col gap-2 pt-2">
              {verificationUri && (
                <button
                  type="button"
                  onClick={() => window.open(verificationUri, "_blank")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Approval Page
                </button>
              )}
              <button
                type="button"
                onClick={cancelSignIn}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Sign In
              </button>
            </div>
          </div>
        )}

        {/* State: Signing In (Initial handshake) */}
        {status === "signing_in" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
            <p className="text-sm text-zinc-400">Connecting to Entry Platform...</p>
          </div>
        )}

        {/* State: Error or Expired */}
        {(status === "connection_error" || status === "session_expired") && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-left w-full text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error || "Authentication could not be completed. Please try again."}</span>
            </div>
            <button
              type="button"
              onClick={signIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Sign In
            </button>
          </div>
        )}

        {/* State: Signed Out / Default */}
        {(status === "signed_out" || status === "initializing") && (
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              disabled={status === "initializing"}
              onClick={signIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
            >
              Sign In with Entry
            </button>
            <p className="text-[11px] text-zinc-500">
              Uses your existing Entry web account (GitHub, Vercel, or Google).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
