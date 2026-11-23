import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const NEAS_ADMIN_SESSION_COOKIE = "neas_admin_session";
const TTL = 8 * 60 * 60;
type Payload = { sub: "neas-admin"; iat: number; exp: number };
function secret(): string | null { const value = process.env.NEAS_SESSION_SECRET?.trim(); return value && value.length >= 32 ? value : null; }
function sign(value: string, key: string): Buffer { return createHmac("sha256", key).update(value).digest(); }
export function verifyNeasAdminPassword(candidate: string): boolean {
 const expected = process.env.NEAS_ADMIN_PASSWORD;
 if (!expected || !candidate || candidate.length > 256) return false;
 return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(candidate).digest());
}
export function createNeasAdminSessionToken(now = Date.now()): string | null {
 const key = secret(); if (!key || !process.env.NEAS_ADMIN_PASSWORD) return null;
 const payload: Payload = { sub:"neas-admin", iat:Math.floor(now/1000), exp:Math.floor(now/1000)+TTL };
 const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
 return encoded+"."+sign(encoded,key).toString("base64url");
}
export function verifyNeasAdminSessionToken(token: string | undefined, now = Date.now()): boolean {
 const key=secret(); if(!key || !process.env.NEAS_ADMIN_PASSWORD || !token || token.length>2048) return false;
 const [encoded,supplied,extra]=token.split("."); if(!encoded || !supplied || extra!==undefined) return false;
 const expected=sign(encoded,key); const actual=Buffer.from(supplied,"base64url");
 if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) return false;
 try {
  const p=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8")) as Partial<Payload>, nowS=Math.floor(now/1000);
  return p.sub==="neas-admin" && Number.isSafeInteger(p.iat) && Number.isSafeInteger(p.exp) && (p.iat as number)<=nowS && (p.exp as number)>nowS && (p.exp as number)-(p.iat as number)<=TTL;
 } catch { return false; }
}
export const NEAS_ADMIN_SESSION_MAX_AGE=TTL;
