import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiRequestError, BackendSession } from "../api/backend-session";
import { safeNext } from "../auth/navigation";
import type { Member, Role } from "../auth/types";

// Deduplicate within this render only; backend reads always use no-store.
export const getCurrentUser = cache(async (): Promise<Member | null> => {
  const sessionId = (await cookies()).get("JSESSIONID")?.value;
  if (!sessionId) return null;
  try {
    // Server Components cannot write cookies; Proxy and Actions relay session invalidations.
    const member = await new BackendSession(sessionId, () => {}).current();
    return member.status === "active" ? member : null;
  } catch (error) {
    if (error instanceof ApiRequestError && [401, 403].includes(error.status)) return null;
    throw error;
  }
});

export async function requireRole(role: Role, requestedPath: string): Promise<Member> {
  const member = await getCurrentUser();
  if (!member) redirect(`/login?next=${encodeURIComponent(safeNext(requestedPath) ?? "/")}`);
  if (member.role !== role) redirect("/forbidden");
  return member;
}
