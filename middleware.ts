import { NextResponse, type NextRequest } from "next/server";

/**
 * NEAS APEX is a public-facing engineering intelligence interface.
 * Keep the public endpoints explicit and deny unknown API routes by default.
 * This prevents a future admin/API route from becoming public accidentally.
 *
 * There is no APEX login/auth API in this application. The previous middleware
 * was copied from the self-hosted GladOS product and depended on auth modules
 * and a localhost probe that do not exist in this repository's APEX app.
 */
const PUBLIC_API_PATHS = new Set([
  "/api/weather",
  "/api/elevenlabs/token",
]);

export function middleware(request: NextRequest) {
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
