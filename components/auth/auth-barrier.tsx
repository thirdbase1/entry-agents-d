"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/app/hooks/use-auth";
import { SignInScreen } from "./sign-in-screen";

export function AuthBarrier({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "initializing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0d] select-none">
        <div className="flex flex-col items-center justify-center animate-pulse">
          <Image
            src="/icon.png"
            alt="Entry Agents"
            width={72}
            height={72}
            className="h-16 w-16 object-contain opacity-75 drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
            priority
          />
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <SignInScreen />;
  }

  return <>{children}</>;
}
