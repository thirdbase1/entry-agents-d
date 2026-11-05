import { NextResponse } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }

    // Verify it is a valid web URL
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
    }

    if (process.platform === "win32") {
      // In Windows, launching via cmd.exe /c start "" "<url>" triggers the system default browser (Chrome, Edge, etc.)
      const child = spawn("cmd.exe", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        windowsVerbatimArguments: true,
      });
      child.unref();
    } else if (process.platform === "darwin") {
      const child = spawn("open", [url], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    } else {
      const child = spawn("xdg-open", [url], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    }

    return NextResponse.json({ success: true, opened: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to launch system browser" },
      { status: 500 }
    );
  }
}
