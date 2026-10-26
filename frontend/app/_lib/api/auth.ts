import "server-only";
import { cookies } from "next/headers";
import { BackendSession } from "./backend-session";

export { ApiRequestError } from "./backend-session";
export async function createAuthSession(): Promise<BackendSession> {
  const store = await cookies();
  return new BackendSession(store.get("JSESSIONID")?.value, (cookie) => store.set(cookie));
}
