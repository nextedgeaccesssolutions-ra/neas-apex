import { afterEach, describe, expect, it } from "vitest";
import {
  createNeasAdminSessionToken,
  NEAS_ADMIN_SESSION_COOKIE,
} from "@/lib/neas-admin-auth";
import {
  authorizeNeasScope,
  hasNeasScope,
  resolveNeasAdminPrincipal,
  resolveNeasAdminPrincipalFromRequest,
} from "@/lib/neas-workforce-authz";

const originalPassword = process.env.NEAS_ADMIN_PASSWORD;
const originalSecret = process.env.NEAS_SESSION_SECRET;

afterEach(() => {
  if (originalPassword === undefined) delete process.env.NEAS_ADMIN_PASSWORD;
  else process.env.NEAS_ADMIN_PASSWORD = originalPassword;
  if (originalSecret === undefined) delete process.env.NEAS_SESSION_SECRET;
  else process.env.NEAS_SESSION_SECRET = originalSecret;
});

function configureSession() {
  process.env.NEAS_ADMIN_PASSWORD = "test-only-admin-password";
  process.env.NEAS_SESSION_SECRET = "test-only-session-secret-that-is-long-enough";
}

describe("NEAS workforce authorization", () => {
  it("rejects missing, malformed, and forged session cookies", () => {
    configureSession();
    expect(resolveNeasAdminPrincipal(undefined)).toBeNull();
    expect(resolveNeasAdminPrincipal("forged.token")).toBeNull();
    expect(resolveNeasAdminPrincipal("")).toBeNull();
  });

  it("derives the administrator principal only from a verified session", () => {
    configureSession();
    const token = createNeasAdminSessionToken();
    expect(token).toBeTruthy();
    const principal = resolveNeasAdminPrincipal(token ?? undefined);
    expect(principal?.subject).toBe("neas-admin");
    expect(principal?.role).toBe("owner_admin");
    expect(Object.isFrozen(principal)).toBe(true);
    expect(Object.isFrozen(principal?.scopes)).toBe(true);
  });

  it("reads the HttpOnly session cookie by its fixed server-side name", () => {
    configureSession();
    const token = createNeasAdminSessionToken();
    const principal = resolveNeasAdminPrincipalFromRequest({
      cookies: { get: (name) => name === NEAS_ADMIN_SESSION_COOKIE && token ? { value: token } : undefined },
    });
    expect(principal?.subject).toBe("neas-admin");
  });

  it("allows a granted scope and denies an ungranted or absent principal", () => {
    configureSession();
    const principal = resolveNeasAdminPrincipal(createNeasAdminSessionToken() ?? undefined);
    expect(hasNeasScope(principal, "workforce:tasks:read")).toBe(true);
    expect(authorizeNeasScope(principal, "audit:read")).toEqual({ allowed: true });
    expect(authorizeNeasScope(null, "audit:read")).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
    expect(authorizeNeasScope(null, "giie:public:ingest")).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("does not accept browser-supplied role or scope claims", () => {
    const forged = {
      subject: "neas-admin",
      role: "owner_admin",
      scopes: ["giie:public:ingest"],
    } as unknown as Parameters<typeof hasNeasScope>[0];
    expect(hasNeasScope(forged, "giie:public:ingest")).toBe(true);
    // The guard is intentionally a policy helper; routes must obtain principals
    // exclusively through resolveNeasAdminPrincipalFromRequest.
    expect(resolveNeasAdminPrincipal("forged")).toBeNull();
  });
});
