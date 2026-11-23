import { NextRequest,NextResponse } from "next/server";
import { isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { NEAS_ADMIN_SESSION_COOKIE } from "@/lib/neas-admin-auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 if(!isSameOriginBrowserRequest(request)) return NextResponse.json({error:"Request not permitted."},{status:403});
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 response.cookies.set(NEAS_ADMIN_SESSION_COOKIE,"",{httpOnly:true,secure:request.nextUrl.protocol==="https:",sameSite:"strict",path:"/",maxAge:0});
 return response;
}