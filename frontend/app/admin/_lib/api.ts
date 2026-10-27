import "server-only";
import { apiFetch } from "@/app/_lib/api/client";

export type MenuSummaryResponse = {
  totalCount: number;
  availableCount: number;
  unavailableCount: number;
};

function invalidResponse(): never {
  throw new Error("메뉴 현황 API 응답 형식이 올바르지 않습니다.");
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : invalidResponse();
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalidResponse();
}

// 백엔드가 삭제(숨김)한 메뉴를 빼고 센다.
export async function getMenuSummary(): Promise<MenuSummaryResponse> {
  const body = record(await apiFetch<unknown>("/api/v1/admin/index/menus"));
  return {
    totalCount: integer(body.totalCount),
    availableCount: integer(body.availableCount),
    unavailableCount: integer(body.unavailableCount),
  };
}
