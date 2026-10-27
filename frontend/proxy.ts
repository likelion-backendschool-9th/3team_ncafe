import { NextResponse, type NextRequest } from "next/server";
import { ApiRequestError, BackendSession, type BackendCookie } from "./app/_lib/api/backend-session";

export async function proxy(request: NextRequest) {
  // Server Action은 화면 경로로 가는 POST다. 여기서 HTTP redirect를 돌려주면 Next가 Action 응답으로 해석하지 못해
  // 화면이 멈춘다. 그대로 넘기고, 각 Action의 권한 확인(requireRole 등)이 Next 방식으로 로그인·forbidden에 보내게 한다.
  if (request.method === "POST" && request.headers.has("next-action")) {
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
