import { NextResponse, type NextRequest } from "next/server";
import { ApiRequestError, BackendSession, type BackendCookie } from "./app/_lib/api/backend-session";

export async function proxy(request: NextRequest) {
  // Order Actions authorize with a cookie-writing session guard before submitting input. Let Next's
  // Action handler encode their redirects; an HTTP Proxy redirect breaks fetch Actions.
  if (request.method === "POST" && (request.nextUrl.pathname === "/admin/orders"
    || request.nextUrl.pathname.startsWith("/admin/orders/"))) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const pending: BackendCookie[] = [];
  const sessionId = request.cookies.get("JSESSIONID")?.value;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  let response: NextResponse;
  if (!sessionId) response = NextResponse.redirect(login);
  else {
    try {
      const member = await new BackendSession(sessionId, (cookie) => pending.push(cookie)).current();
      const role = request.nextUrl.pathname.startsWith("/admin") ? "admin" : "customer";
      response = member.role === role ? NextResponse.next() : NextResponse.redirect(new URL("/forbidden", request.url));
    } catch (error) {
      if (!(error instanceof ApiRequestError) || ![401, 403].includes(error.status)) throw error;
      response = NextResponse.redirect(login);
    }
  }
  for (const cookie of pending) response.cookies.set(cookie);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/cart/:path*", "/checkout/:path*", "/my/:path*", "/admin/:path*"] };
