import { NextResponse, type NextRequest } from "next/server";

/**
 * NEAS APEX is a public engineering-intelligence frontend.
 * Keep public API routes explicit and deny unknown API/admin paths by default.
 * The previous GladOS gate referenced auth modules and routes that are absent
 * from this repository, so it could not provide a working authentication gate.
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
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|agents/|.*\\.(?:png|jpg|jpeg|webp|svg|ico|ttf|woff2?)$).*)"],
};
