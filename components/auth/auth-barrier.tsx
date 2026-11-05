"use client";

import * as React from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { SignInScreen } from "./sign-in-screen";

export function AuthBarrier({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "initializing") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b0b0d] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs">Initializing Entry Agents Desktop...</span>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <SignInScreen />;
  }

  return <>{children}</>;
}
