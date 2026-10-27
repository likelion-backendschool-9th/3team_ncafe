// Test-only upstream: forward to the isolated backend and fail the first login of a fail-login-* account.
import { createServer } from "node:http";
const failed = new Set();
const orderFaults = new Map();
const target = process.env.E2E_BACKEND_ORIGIN ?? "http://localhost:18080";
const server = createServer(async (request, response) => {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const url = new URL(request.url, target);
    const session = request.headers.cookie?.match(/(?:^|;\s*)JSESSIONID=([^;]+)/)?.[1];
    // Opt-in test control, scoped to the authenticated test session. Never part of the app/backend.
    if (process.env.E2E_ORDER_FAULTS === "1" && url.pathname === "/api/v1/__e2e/orders-fault" && request.method === "POST" && session) {
      const { mode } = JSON.parse(body.toString());
      if (!["off", "unavailable", "malformed", "write-failed", "csrf-invalid"].includes(mode)) throw new Error("Invalid fixture");
      if (mode === "off") orderFaults.delete(session); else orderFaults.set(session, mode);
      response.writeHead(204); response.end(); return;
    }
    const fault = orderFaults.get(session);
    const orderRead = request.method === "GET" && url.pathname === "/api/v1/admin/orders";
    const orderWrite = request.method === "PUT" && url.pathname === "/api/v1/admin/orders/status";
    if ((orderRead && ["unavailable", "malformed"].includes(fault)) || (orderWrite && fault === "write-failed")
      || (url.pathname === "/api/v1/auth/csrf" && fault === "csrf-invalid")) {
      const status = fault === "malformed" ? 200 : fault === "csrf-invalid" ? 403 : 503;
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(fault === "malformed" ? { items: "invalid" }
        : { code: fault === "csrf-invalid" ? "CSRF_INVALID" : "BACKEND_UNAVAILABLE", message: "격리 테스트 장애" }));
      return;
    }
    if (url.pathname === "/api/v1/auth/login") {
      const email = new URLSearchParams(body.toString()).get("email") ?? "";
      if (email.startsWith("fail-login-") && !failed.has(email)) {
        failed.add(email);
        response.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ code: "BACKEND_UNAVAILABLE", message: "잠시 후 다시 시도해 주세요." }));
        return;
      }
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (name !== "host" && name !== "connection" && value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
    const upstream = await fetch(url, { method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : body, redirect: "manual" });
    response.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      if (!["set-cookie", "content-encoding", "content-length", "transfer-encoding"].includes(name)) response.setHeader(name, value);
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) response.setHeader("Set-Cookie", cookies);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: "BACKEND_UNAVAILABLE", message: "테스트 백엔드 연결을 확인해 주세요." }));
  }
});
server.listen(18081, "localhost", () => process.stdout.write("Auth test upstream ready on localhost:18081\n"));
process.on("SIGTERM", () => server.close());
