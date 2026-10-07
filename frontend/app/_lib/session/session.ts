import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findMockUserById, type Role, type User } from "../mock/users";

const cookieName = "ncafe_mock_session";
const maxAgeSeconds = 60 * 60 * 8;

type SessionPayload = { userId: string; expiresAt: number };

function secret(): string {
  const value = process.env.MOCK_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Set MOCK_SESSION_SECRET to at least 32 characters in .env.local.");
  }
  return value;
}

function signature(payload: string): Buffer {
  return createHmac("sha256", secret()).update(payload).digest();
}

function decode(token: string): SessionPayload | null {
  const [payload, signed] = token.split(".");
  if (!payload || !signed) return null;
  const expected = signature(payload);
  const actual = Buffer.from(signed, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return typeof session.userId === "string" && session.expiresAt > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + maxAgeSeconds * 1000 }),
  ).toString("base64url");
  const token = `${payload}.${signature(payload).toString("base64url")}`;
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(cookieName);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = decode(token);
  if (!session) return null;
  const user = findMockUserById(session.userId);
  return user?.status === "active" ? user : null;
}

export async function requireRole(role: Role, requestedPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
  if (user.role !== role) redirect("/forbidden");
  return user;
}
