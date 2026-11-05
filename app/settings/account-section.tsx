"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/app/hooks/use-auth";
import {
  CreditCard,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Coins,
  RefreshCw,
  User,
} from "lucide-react";

export function AccountSection() {
  const { user, signOut, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const balanceFormatted = user
    ? `$${(user.creditBalanceCents / 100).toFixed(2)}`
    : "$0.00";

  return (
    <div className="flex flex-col gap-6 text-zinc-200">
      <div>
        <h2 className="text-base font-semibold text-white">Entry Account</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your authenticated Entry platform identity, subscription, and model credits.
        </p>
      </div>

      {user ? (
        <div className="flex flex-col gap-4">
          {/* User Card */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 overflow-hidden">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.email}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-zinc-400" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {user.name || user.email || "Entry Developer"}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {user.email || user.userId}
                </span>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Authenticated via OS Credential Store</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
              className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Refresh Account Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Plan & Credits Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Plan Card */}
            <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <span>Subscription Plan</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {user.planName || "Entry Pro"}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                Full 1M token context window access
              </span>
            </div>

            {/* Credit Balance Card */}
            <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>Available Credits</span>
              </div>
              <div className="mt-2 text-lg font-semibold font-mono text-emerald-400">
                {balanceFormatted}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                Real-time usage attribution
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <a
              href="https://entry-agents.dev/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>Manage Billing & Top Up</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-400">Not signed in to Entry platform.</p>
        </div>
      )}
    </div>
  );
}
