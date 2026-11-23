import {
  NEAS_ADMIN_SESSION_COOKIE,
  verifyNeasAdminSessionToken,
} from "@/lib/neas-admin-auth";

export type NeasWorkforceRole =
  | "owner_admin"
  | "operator"
  | "analyst"
  | "specialist";

export type NeasWorkforceScope =
  | "admin:dashboard:read"
  | "workforce:tasks:read"
  | "workforce:tasks:submit"
  | "workforce:tasks:approve"
  | "workforce:agents:configure"
  | "giie:public:search"
  | "giie:public:ingest"
  | "audit:read"
  | "models:read"
  | "models:validate";

export interface NeasAuthenticatedPrincipal {
  readonly subject: "neas-admin";
  readonly role: "owner_admin";
  readonly scopes: readonly NeasWorkforceScope[];
}

/**
 * Resolve the current administrator from the signed, HttpOnly session cookie.
 * No role or scope is accepted from request JSON, headers, query parameters,
 * or browser-controlled state.
 *
 * This intentionally returns only the single administrator identity supported
 * by the current password-based session implementation. Additional users and
 * roles require a real identity provider and persisted role assignments.
 */
export function resolveNeasAdminPrincipal(
  cookieValue: string | undefined,
): NeasAuthenticatedPrincipal | null {
  if (!verifyNeasAdminSessionToken(cookieValue)) return null;

  return Object.freeze({
    subject: "neas-admin" as const,
    role: "owner_admin" as const,
    scopes: Object.freeze([
      "admin:dashboard:read",
      "workforce:tasks:read",
      "workforce:tasks:submit",
      "workforce:tasks:approve",
      "workforce:agents:configure",
      "giie:public:search",
      "giie:public:ingest",
      "audit:read",
      "models:read",
      "models:validate",
    ] as const),
  });
}

export function resolveNeasAdminPrincipalFromRequest(request: {
  cookies: { get(name: string): { value: string } | undefined };
}): NeasAuthenticatedPrincipal | null {
  return resolveNeasAdminPrincipal(
    request.cookies.get(NEAS_ADMIN_SESSION_COOKIE)?.value,
  );
}

export function hasNeasScope(
  principal: NeasAuthenticatedPrincipal | null | undefined,
  required: NeasWorkforceScope,
): boolean {
  return Boolean(principal && principal.scopes.includes(required));
}

/**
 * Fail-closed scope guard for route handlers. Call only after resolving the
 * principal from the verified server-side session.
 */
export function authorizeNeasScope(
  principal: NeasAuthenticatedPrincipal | null | undefined,
  required: NeasWorkforceScope,
): { allowed: true } | { allowed: false; reason: "unauthenticated" | "insufficient_scope" } {
  if (!principal) return { allowed: false, reason: "unauthenticated" };
  if (!hasNeasScope(principal, required)) {
    return { allowed: false, reason: "insufficient_scope" };
  }
  return { allowed: true };
}
