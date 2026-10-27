import { NextResponse } from "next/server";
import { parseMember, type Member } from "../auth/types";

export type BackendCookie = ReturnType<NextResponse["cookies"]["getAll"]>[number];
export type SignupInput = { name: string; email: string; password: string; passwordConfirm: string };
export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiOrigin(): string {
  const url = new URL(process.env.API_ORIGIN ?? "http://localhost:8080");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || url.pathname !== "/" || url.search || url.hash) throw new Error("API_ORIGIN에는 백엔드 origin을 설정해 주세요.");
  return url.origin;
}

// One jar per request/action; never share authentication cookies between users.
export class BackendSession {
  private readonly jar = new Map<string, string>();
  constructor(sessionId: string | undefined, private readonly onCookie: (cookie: BackendCookie) => void,
    private readonly origin = apiOrigin(), private readonly fetcher: typeof fetch = fetch) {
    if (sessionId) this.jar.set("JSESSIONID", sessionId);
  }

  private async send(path: `/api/v1/${string}`, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.delete("cookie");
    if (this.jar.size) headers.set("cookie", [...this.jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "));
    let response: Response;
    try {
      response = await this.fetcher(`${this.origin}${path}`, {
        ...init, headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ApiRequestError(503, "BACKEND_UNAVAILABLE", "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    // Preserve distinct headers and Expires commas; update the jar before any following request.
    for (const header of response.headers.getSetCookie()) {
      for (const cookie of new NextResponse(null, { headers: { "set-cookie": header } }).cookies.getAll()) {
        // Next's parser omits a falsy Max-Age=0; retain explicit deletion and Max-Age precedence over Expires.
        const maxAge = /(?:^|;)\s*Max-Age=(-?\d+)(?:;|$)/i.exec(header);
        if (maxAge) cookie.maxAge = Number(maxAge[1]);
        const expires = cookie.expires instanceof Date ? cookie.expires.getTime() : cookie.expires;
        const expired = cookie.maxAge !== undefined ? cookie.maxAge <= 0 : expires !== undefined && expires <= Date.now();
        if (expired) this.jar.delete(cookie.name);
        else this.jar.set(cookie.name, cookie.value);
        this.onCookie(cookie);
      }
    }
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      const error = value && typeof value === "object" ? value as Record<string, unknown> : {};
      throw new ApiRequestError(response.status, typeof error.code === "string" ? error.code : "REQUEST_FAILED",
        typeof error.message === "string" ? error.message : "요청을 처리하지 못했습니다.");
    }
    return response;
  }

  private async csrf(): Promise<{ headerName: string; token: string }> {
    const value: unknown = await (await this.send("/api/v1/auth/csrf")).json();
    if (!value || typeof value !== "object" || !("headerName" in value) || !("token" in value)
      || value.headerName !== "X-CSRF-TOKEN" || typeof value.token !== "string" || !value.token) {
      throw new Error("CSRF 응답을 확인할 수 없습니다.");
    }
    return { headerName: value.headerName, token: value.token };
  }

  async current(): Promise<Member> {
    return parseMember(await (await this.send("/api/v1/my")).json());
  }

  // Business requests share the authentication cookie jar and error-cookie relay.
  // A mutation gets a fresh token once; never replay a potentially committed write.
  async requestJson(path: `/api/v1/${string}`, init: RequestInit = {}): Promise<unknown> {
    const method = (init.method ?? "GET").toUpperCase();
    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      throw new Error("지원하지 않는 요청 방식입니다.");
    }
    const headers = new Headers(init.headers);
    if (!["GET", "HEAD"].includes(method)) {
      const csrf = await this.csrf();
      headers.set(csrf.headerName, csrf.token);
    }
    if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await this.send(path, { ...init, method, headers });
    return response.status === 204 || method === "HEAD" ? undefined : response.json();
  }

  async signup(input: SignupInput): Promise<Member> {
    const csrf = await this.csrf();
    return parseMember(await (await this.send("/api/v1/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: JSON.stringify(input),
    })).json());
  }
  async login(email: string, password: string): Promise<Member> {
    const csrf = await this.csrf();
    const member = parseMember(await (await this.send("/api/v1/auth/login", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", [csrf.headerName]: csrf.token },
      body: new URLSearchParams({ email, password }),
    })).json());
    await this.csrf();
    return member;
  }
  async logout(): Promise<void> {
    let csrf;
    try { csrf = await this.csrf(); }
    catch (error) {
      // A status check may invalidate this account. Obtain an anonymous token after that cleanup.
      if (!(error instanceof ApiRequestError) || ![401, 403].includes(error.status)) throw error;
      csrf = await this.csrf();
    }
    await this.send("/api/v1/auth/logout", { method: "POST", headers: { [csrf.headerName]: csrf.token } });
  }
}
