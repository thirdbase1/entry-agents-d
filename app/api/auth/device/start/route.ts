import { NextResponse } from "next/server";
import { getDeviceAuthService } from "@/lib/auth/device-auth";

export async function POST() {
  try {
    const authService = getDeviceAuthService();
    const result = await authService.startDeviceAuthorization();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to start device authorization" },
      { status: 500 }
    );
  }
}
