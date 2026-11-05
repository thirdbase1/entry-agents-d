import { NextResponse } from "next/server";
import { getDeviceAuthService } from "@/lib/auth/device-auth";

export async function GET() {
  try {
    const authService = getDeviceAuthService();
    const profile = await authService.validateSession();
    if (!profile) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({
      authenticated: true,
      user: profile,
    });
  } catch (err) {
    return NextResponse.json(
      { authenticated: false, error: (err as Error).message },
      { status: 200 }
    );
  }
}

export async function DELETE() {
  try {
    const authService = getDeviceAuthService();
    authService.signOut();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
