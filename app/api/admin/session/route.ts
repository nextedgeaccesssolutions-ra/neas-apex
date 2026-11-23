import { NextRequest,NextResponse } from "next/server";
import { NEAS_ADMIN_SESSION_COOKIE,verifyNeasAdminSessionToken } from "@/lib/neas-admin-auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const authenticated=verifyNeasAdminSessionToken(request.cookies.get(NEAS_ADMIN_SESSION_COOKIE)?.value);
 return NextResponse.json({authenticated},{headers:{"Cache-Control":"no-store"}});
}