import "server-only";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import type { UserListQuery } from "./searchParams";
import { isUserRole, isUserStatus, type UserPageResponse, type UserResponse, type UserSummaryResponse } from "./user";

export const USER_PAGE_SIZE = 20;

function invalidResponse(): never {
  throw new Error("회원 API 응답 형식이 올바르지 않습니다.");
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : invalidResponse();
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalidResponse();
}

function text(value: unknown): string {
  return typeof value === "string" ? value : invalidResponse();
}

function parseUser(value: unknown): UserResponse {
  const user = record(value);
  if (!isUserRole(user.role) || !isUserStatus(user.status)) invalidResponse();
  return { id: integer(user.id), name: text(user.name), email: text(user.email), role: user.role, status: user.status };
}

// 검색·필터·정렬은 백엔드가 전체 회원에 적용한 뒤 페이지를 자른다.
// URL page는 1부터, API page는 0부터 센다.
export async function getUsers(query: UserListQuery): Promise<UserPageResponse> {
  const params = new URLSearchParams({ page: String(query.page - 1), size: String(USER_PAGE_SIZE), sort: query.sort });
  for (const key of ["q", "status", "role"] as const) {
    if (query[key]) params.set(key, query[key]);
  }

  const body = record(await apiFetch<unknown>(`/api/v1/admin/users?${params}`));
  if (!Array.isArray(body.items)) invalidResponse();

  return {
    items: body.items.map(parseUser),
    page: integer(body.page) + 1,
    size: integer(body.size),
    totalElements: integer(body.totalElements),
    totalPages: Math.max(1, integer(body.totalPages)),
  };
}

export async function getUserSummary(): Promise<UserSummaryResponse> {
  const body = record(await apiFetch<unknown>("/api/v1/admin/users/summary"));
  return { totalCount: integer(body.totalCount), activeCount: integer(body.activeCount), suspendedCount: integer(body.suspendedCount) };
}

export async function getUser(id: number): Promise<UserResponse | null> {
  try {
    return parseUser(await apiFetch<unknown>(`/api/v1/admin/users/${id}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
