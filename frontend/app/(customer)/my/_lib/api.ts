import "server-only";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";

// 백엔드 dto/users/UserResponse와 같은 형태다.
export type UserResponse = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin";
  status: "active" | "suspended";
};

function parseUser(value: unknown): UserResponse {
  const user = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  if (
    typeof user.id !== "number"
    || typeof user.name !== "string"
    || typeof user.email !== "string"
    || (user.role !== "customer" && user.role !== "admin")
    || (user.status !== "active" && user.status !== "suspended")
  ) {
    throw new Error("내 정보 API 응답 형식이 올바르지 않습니다.");
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}

// 로그인한 회원 본인의 정보. 비로그인(401)은 로그인 화면으로, 정지 회원(403)은 접근 제한 화면으로 보낸다.
export async function getMyProfile(): Promise<UserResponse> {
  try {
    return parseUser(await apiFetch<unknown>("/api/v1/my"));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) redirect("/login?next=%2Fmy");
    if (error instanceof ApiRequestError && error.status === 403) redirect("/forbidden");
    throw error;
  }
}
