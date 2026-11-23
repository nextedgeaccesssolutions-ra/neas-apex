import { NextRequest,NextResponse } from "next/server";
import { consumeRateLimit,isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { createNeasAdminSessionToken,NEAS_ADMIN_SESSION_COOKIE,NEAS_ADMIN_SESSION_MAX_AGE,verifyNeasAdminPassword } from "@/lib/neas-admin-auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 if(!isSameOriginBrowserRequest(request)) return NextResponse.json({error:"Request not permitted."},{status:403});
 const rate=consumeRateLimit(request,"neas-admin-login",5,15*60*1000);
 if(!rate.allowed) return NextResponse.json({error:"Too many sign-in attempts. Try again later."},{status:429});
 let body:{password?:unknown}; try{body=await request.json() as typeof body;}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 if(typeof body.password!=="string" || !verifyNeasAdminPassword(body.password)) return NextResponse.json({error:"Invalid credentials."},{status:401,headers:{"Cache-Control":"no-store"}});
 const token=createNeasAdminSessionToken();
 if(!token) return NextResponse.json({error:"Admin authentication is not configured. Set NEAS_ADMIN_PASSWORD and a 32-character NEAS_SESSION_SECRET."},{status:503});
 const response=NextResponse.json({ok:true,expiresIn:NEAS_ADMIN_SESSION_MAX_AGE},{headers:{"Cache-Control":"no-store"}});
 response.cookies.set(NEAS_ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:request.nextUrl.protocol==="https:",sameSite:"strict",path:"/",maxAge:NEAS_ADMIN_SESSION_MAX_AGE});
 return response;
}