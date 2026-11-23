import { NextResponse,type NextRequest } from "next/server";
// Canonical worker endpoint: /api/internal/workforce/worker (cron + manual). Do not probe /api/worker/* — it 404s by design.
const PUBLIC_API_PATHS=new Set(["/api/weather","/api/ai/chat","/api/health","/api/admin/login","/api/admin/session","/api/admin/logout","/api/admin/workforce/tasks","/api/admin/models/probe","/api/admin/giie/sources","/api/giie/search","/api/giie/ingest","/api/internal/workforce/worker"]);
export function proxy(request:NextRequest) {
 const {pathname}=request.nextUrl;
 // Keep the admin UI closed until each page is connected to session authorization.
 if(pathname==="/admin" || pathname.startsWith("/admin/")) return new NextResponse("Not found",{status:404});
 if(pathname.startsWith("/api/") && !PUBLIC_API_PATHS.has(pathname)) return NextResponse.json({error:"Not found"},{status:404});
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|ttf|woff2?)$).*)"]};