import "server-only";
import { apiFetch } from "@/app/_lib/api/client";

export type MenuSummaryResponse = {
  totalCount: number;
  availableCount: number;
  unavailableCount: number;
};

export type OrderSummaryResponse = { activeCount: number };

export type SongSummaryResponse = { pendingCount: number };

function invalidResponse(): never {
  throw new Error("관리자 홈 API 응답 형식이 올바르지 않습니다.");
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

// 주문 관리 목록의 "처리 중" 그룹(접수·준비 중·준비 완료)과 같은 기준이다.
export async function getOrderSummary(): Promise<OrderSummaryResponse> {
  const body = record(await apiFetch<unknown>("/api/v1/admin/index/orders"));
  return { activeCount: integer(body.activeCount) };
}

// 아직 플레이리스트에 담지 않은 접수 상태의 신청곡 수다.
export async function getSongSummary(): Promise<SongSummaryResponse> {
  const body = record(await apiFetch<unknown>("/api/v1/admin/index/songs"));
  return { pendingCount: integer(body.pendingCount) };
}
