import { NextRequest, NextResponse } from "next/server";
import { getDeviceAuthService } from "@/lib/auth/device-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceCode = body.device_code;
    if (!deviceCode) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      );
    }

    const authService = getDeviceAuthService();
    const result = await authService.pollDeviceToken(deviceCode);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to poll device token" },
      { status: 500 }
    );
  }
}
