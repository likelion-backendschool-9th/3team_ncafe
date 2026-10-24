import "server-only";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
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

// page는 URL 기준(1부터)으로 받고 API에는 0부터 넘긴다.
export async function getUsers(page: number): Promise<UserPageResponse> {
  const body = record(await apiFetch<unknown>(`/api/v1/admin/users?page=${page - 1}&size=${USER_PAGE_SIZE}`));
  if (!Array.isArray(body.items)) invalidResponse();

  return {
    items: body.items.map(parseUser),
    page: integer(body.page) + 1,
    size: integer(body.size),
    totalElements: integer(body.totalElements),
    totalPages: integer(body.totalPages),
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
