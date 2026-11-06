"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/app/hooks/use-auth";
import { openExternal } from "@/lib/desktop";
import {
  ExternalLink,
  AlertCircle,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Cpu,
  FolderGit2,
  ShieldCheck,
} from "lucide-react";

export function SignInScreen() {
  const {
    status,
    userCode,
    verificationUri,
    error,
    signIn,
    cancelSignIn,
  } = useAuth();

  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = React.useCallback(() => {
    if (!userCode) return;
    void navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [userCode]);

  const handleReopenBrowser = React.useCallback(() => {
    if (verificationUri) {
      void openExternal(verificationUri);
    }
  }, [verificationUri]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0b0d] text-zinc-100 select-none overflow-hidden">
      {/* Draggable header region for frameless desktop window */}
      <div
        className="absolute top-0 inset-x-0 h-10 select-none cursor-default"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[460px] w-[460px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6 py-8 flex flex-col items-center text-center">
        {/* 3D Metallic Shield Logo */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center drop-shadow-[0_16px_36px_rgba(0,0,0,0.85)] transition-transform hover:scale-105 duration-300">
          <Image
            src="/icon.png"
            alt="Entry Agents"
            width={96}
            height={96}
            className="h-24 w-24 object-contain rounded-2xl"
            priority
          />
        </div>

        {/* Product Identity */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Entry Agents Desktop
        </h1>
        <p className="text-sm text-zinc-400 mb-6 max-w-sm leading-relaxed">
          Autonomous AI software engineering client connected to the Entry platform.
        </p>

        {/* Feature Highlights (OpenCode pattern) */}
        {status === "signed_out" && (
          <div className="grid grid-cols-3 gap-2 w-full mb-7 text-left">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 flex flex-col gap-1.5">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <div className="text-[11px] font-semibold text-zinc-200">1M Context</div>
              <div className="text-[10px] text-zinc-500 leading-tight">Step 5, GLM, DeepSeek & Claude</div>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 flex flex-col gap-1.5">
              <FolderGit2 className="h-4 w-4 text-emerald-400" />
              <div className="text-[11px] font-semibold text-zinc-200">Local Sandbox</div>
              <div className="text-[10px] text-zinc-500 leading-tight">Files, terminal & git worktrees</div>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 flex flex-col gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <div className="text-[11px] font-semibold text-zinc-200">OS Vault</div>
              <div className="text-[10px] text-zinc-500 leading-tight">Hardware encrypted storage</div>
            </div>
          </div>
        )}

        {/* State: Awaiting Browser Approval */}
        {status === "awaiting_approval" && (
          <div className="w-full flex flex-col items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <div className="w-full flex flex-col items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                Confirmation Code
              </span>
              <div className="relative flex items-center justify-center gap-3 w-full py-2">
                <span className="font-mono text-3xl font-bold tracking-[0.25em] text-white">
                  {userCode || "••••••"}
                </span>
                {userCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copy Code"
                    className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Waiting for approval in your browser...</span>
            </div>

            <div className="flex w-full flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleReopenBrowser}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors border border-zinc-700/60 shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Reopen Approval Page
              </button>
              <button
                type="button"
                onClick={cancelSignIn}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl hover:bg-zinc-800/40 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* State: Signing In (Initial handshake) */}
        {status === "signing_in" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-xs text-zinc-400 font-medium">Connecting to Entry platform...</p>
          </div>
        )}

        {/* State: Error or Expired */}
        {(status === "connection_error" || status === "session_expired") && (
          <div className="w-full flex flex-col items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-left w-full text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error || "Authentication could not be completed. Please try again."}</span>
            </div>
            <button
              type="button"
              onClick={signIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Sign In
            </button>
          </div>
        )}

        {/* State: Signed Out / Default */}
        {status === "signed_out" && (
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={signIn}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99]"
            >
              <span>Sign In with Entry</span>
              <ExternalLink className="h-4 w-4 text-emerald-200 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-[11px] text-zinc-500">
              Opens your browser to sign in with your Entry account (GitHub, Vercel, or Google).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
