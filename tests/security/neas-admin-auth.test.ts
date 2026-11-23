import { afterEach,describe,expect,it,vi } from "vitest";
import { createNeasAdminSessionToken,verifyNeasAdminPassword,verifyNeasAdminSessionToken } from "@/lib/neas-admin-auth";
describe("NEAS admin signed sessions",()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it("fails closed when authentication secrets are missing",()=>{
  vi.stubEnv("NEAS_ADMIN_PASSWORD",""); vi.stubEnv("NEAS_SESSION_SECRET","");
  expect(verifyNeasAdminPassword("anything")).toBe(false);
  expect(createNeasAdminSessionToken()).toBeNull();
  expect(verifyNeasAdminSessionToken("invalid")).toBe(false);
 });
 it("verifies the configured password without exposing it",()=>{
  vi.stubEnv("NEAS_ADMIN_PASSWORD","a-long-test-password"); vi.stubEnv("NEAS_SESSION_SECRET","01234567890123456789012345678901");
  expect(verifyNeasAdminPassword("a-long-test-password")).toBe(true);
  expect(verifyNeasAdminPassword("wrong-password")).toBe(false);
 });
 it("issues a signed, expiring session and rejects tampering",()=>{
  vi.stubEnv("NEAS_ADMIN_PASSWORD","a-long-test-password"); vi.stubEnv("NEAS_SESSION_SECRET","01234567890123456789012345678901");
  const now=1_800_000_000_000, token=createNeasAdminSessionToken(now);
  expect(token).toBeTruthy();
  expect(verifyNeasAdminSessionToken(token??undefined,now)).toBe(true);
  expect(verifyNeasAdminSessionToken(token+"x",now)).toBe(false);
  expect(verifyNeasAdminSessionToken(token??undefined,now+8*60*60*1000+1000)).toBe(false);
 });
 it("rejects secrets shorter than 32 characters",()=>{
  vi.stubEnv("NEAS_ADMIN_PASSWORD","a-long-test-password"); vi.stubEnv("NEAS_SESSION_SECRET","too-short");
  expect(createNeasAdminSessionToken()).toBeNull();
 });
});