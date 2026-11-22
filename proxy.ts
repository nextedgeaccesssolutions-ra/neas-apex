import { NextResponse, type NextRequest } from "next/server";

/**
 * Public NEAS APEX frontend boundary.
 * Only explicitly reviewed public APIs are reachable; new API routes default
 * to 404 until their authentication and authorization requirements are added.
 */
const PUBLIC_API_PATHS = new Set([
  "/api/weather",
  "/api/ai/chat",
  "/api/elevenlabs/token",
  "/api/elevenlabs/signed-url",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname.startsWith("/api/") && !PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|ttf|woff2?)$).*)",
  ],
};
