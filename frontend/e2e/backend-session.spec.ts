import { test, expect } from "@playwright/test";
import { ApiRequestError, BackendSession, type BackendCookie } from "../app/_lib/api/backend-session";
import { safeNext } from "../app/_lib/auth/navigation";

const member = { id: 42, name: "테스트 회원", email: "member@example.com", role: "customer", status: "active" };
function json(body: unknown, cookies: string[] = [], status = 200) {
  const headers = new Headers({ "Content-Type": "application/json" });
  cookies.forEach(cookie => headers.append("Set-Cookie", cookie));
  return new Response(JSON.stringify(body), { status, headers });
}

test("relay keeps every Set-Cookie and sends the rotated session and refreshed CSRF", async () => {
  const relayed: BackendCookie[] = [];
  let call = 0;
  const fetcher: typeof fetch = async (url, init) => {
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("manual");
    const cookie = new Headers(init?.headers).get("cookie");
    switch (++call) {
      case 1:
        expect(cookie).toBeNull();
        return json({ headerName: "X-CSRF-TOKEN", token: "before" }, [
          "JSESSIONID=anonymous; Path=/; HttpOnly; SameSite=Lax",
          `preference=one; Domain=example.com; Path=/cafe; Secure; HttpOnly; SameSite=None; Max-Age=3600; Expires=${new Date(Date.now() + 86_400_000).toUTCString()}`,
        ]);
      case 2:
        expect(String(url)).toContain("/auth/login");
        expect(cookie).toContain("JSESSIONID=anonymous");
        expect(cookie).toContain("preference=one");
        expect(new Headers(init?.headers).get("X-CSRF-TOKEN")).toBe("before");
        return json(member, ["JSESSIONID=authenticated; Path=/; HttpOnly; SameSite=Lax"]);
      case 3:
        expect(cookie).toContain("JSESSIONID=authenticated");
        return json({ headerName: "X-CSRF-TOKEN", token: "after" });
      default:
        expect(cookie).toContain("JSESSIONID=authenticated");
        return json(member);
    }
  };
  const session = new BackendSession(undefined, cookie => relayed.push(cookie), "http://backend.local", fetcher);
  expect(await session.login("member@example.com", "password123!")).toEqual(member);
  expect(await session.current()).toEqual(member);
  expect(relayed).toHaveLength(3);
  expect(relayed[1]).toMatchObject({ name: "preference", value: "one", domain: "example.com", path: "/cafe",
    secure: true, httpOnly: true, sameSite: "none", maxAge: 3600 });
  expect(relayed[1].expires).toBeInstanceOf(Date);
});

test("error responses still relay cookie invalidation and do not reuse the old session", async () => {
  const relayed: BackendCookie[] = [];
  let count = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    if (++count === 1) return json({ code: "FORBIDDEN", message: "접근 권한이 없습니다." }, ["JSESSIONID=; Path=/; Max-Age=0; HttpOnly"], 403);
    expect(new Headers(init?.headers).get("cookie")).toBeNull();
    return json(member);
  };
  const session = new BackendSession("expired", cookie => relayed.push(cookie), "http://backend.local", fetcher);
  await expect(session.current()).rejects.toBeInstanceOf(ApiRequestError);
  expect(relayed[0]).toMatchObject({ name: "JSESSIONID", maxAge: 0, path: "/" });
  expect(await session.current()).toEqual(member);
});

test("only safe relative next paths are accepted", () => {
  for (const path of ["//evil.example", "https://evil.example", "/\\evil.example", "/%5cevil.example", "/%2fevil.example", "/%0aLocation:x", "/%zz", null]) {
    expect(safeNext(path)).toBeNull();
  }
  expect(safeNext("/my/orders?page=2")).toBe("/my/orders?page=2");
});

test("business PUT uses the CSRF response's rotated cookie and preserves its error cookie", async () => {
  let calls = 0;
  const relayed: BackendCookie[] = [];
  const session = new BackendSession("original", cookie => relayed.push(cookie), "http://backend.local", async (_url, init) => {
    const headers = new Headers(init?.headers);
    if (++calls === 1) {
      expect(headers.get("cookie")).toContain("JSESSIONID=original");
      return json({ headerName: "X-CSRF-TOKEN", token: "fresh" }, ["JSESSIONID=rotated; Path=/; HttpOnly"]);
    }
    expect(init?.method).toBe("PUT");
    expect(init?.cache).toBe("no-store");
    expect(headers.get("cookie")).toBe("JSESSIONID=rotated");
    expect(headers.get("X-CSRF-TOKEN")).toBe("fresh");
    expect(headers.get("Content-Type")).toBe("application/json");
    return json({ code: "STALE_STATUS", message: "이미 변경됨" }, ["JSESSIONID=; Path=/; Max-Age=0"], 409);
  });
  await expect(session.requestJson("/api/v1/admin/orders/status", {
    method: "PUT", body: "{}", headers: { cookie: "other-user", "X-CSRF-TOKEN": "forged" },
  })).rejects.toMatchObject({ status: 409, code: "STALE_STATUS" });
  expect(calls).toBe(2); // The write must not be replayed.
  expect(relayed.at(-1)).toMatchObject({ name: "JSESSIONID", maxAge: 0 });
});

test("business GET needs no CSRF and 204 mutations return no JSON", async () => {
  const requests: string[] = [];
  const session = new BackendSession("admin", () => {}, "http://backend.local", async (url, init) => {
    requests.push(String(url));
    if (String(url).endsWith("/auth/csrf")) return json({ headerName: "X-CSRF-TOKEN", token: "token" });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return json({ items: [] });
  });
  expect(await session.requestJson("/api/v1/admin/orders")).toEqual({ items: [] });
  expect(requests).toHaveLength(1);
  expect(await session.requestJson("/api/v1/cart/items/1", { method: "DELETE" })).toBeUndefined();
});

test("a rejected CSRF lookup never sends the business write", async () => {
  let calls = 0;
  const session = new BackendSession("expired", () => {}, "http://backend.local", async () => {
    calls++;
    return json({ code: "UNAUTHENTICATED", message: "로그인 필요" }, [], 401);
  });
  await expect(session.requestJson("/api/v1/admin/orders/status", { method: "PUT", body: "{}" }))
    .rejects.toMatchObject({ status: 401 });
  expect(calls).toBe(1);
});
