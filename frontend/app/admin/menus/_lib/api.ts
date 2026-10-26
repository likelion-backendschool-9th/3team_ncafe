import "server-only";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import { MENU_PAGE_SIZE, type MenuPageResponse, type MenuResponse } from "./menu";
import type { MenuListQuery } from "./searchParams";

function invalidResponse(): never {
  throw new Error("메뉴 API 응답 형식이 올바르지 않습니다.");
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

function bool(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalidResponse();
}

function parseMenu(value: unknown): MenuResponse {
  const menu = record(value);
  return {
    id: integer(menu.id),
    slug: text(menu.slug),
    name: text(menu.name),
    description: text(menu.description),
    imageUrl: text(menu.imageUrl),
    price: integer(menu.price),
    categoryId: integer(menu.categoryId),
    categoryName: text(menu.categoryName),
    available: bool(menu.available),
    isNew: bool(menu.isNew),
    recommended: bool(menu.recommended),
    supportsHot: bool(menu.supportsHot),
    supportsIced: bool(menu.supportsIced),
    createdAt: text(menu.createdAt),
    updatedAt: text(menu.updatedAt),
  };
}

// 검색·필터·정렬은 백엔드가 숨기지 않은 전체 메뉴에 적용한 뒤 페이지를 자른다.
// URL page는 1부터, API page는 0부터 센다.
export async function getMenus(query: MenuListQuery): Promise<MenuPageResponse> {
  const params = new URLSearchParams({ page: String(query.page - 1), size: String(MENU_PAGE_SIZE), sort: query.sort });
  if (query.q) params.set("q", query.q);
  if (query.categoryId !== null) params.set("categoryId", String(query.categoryId));
  if (query.status) params.set("status", query.status);

  const body = record(await apiFetch<unknown>(`/api/v1/admin/menus?${params}`));
  if (!Array.isArray(body.items)) invalidResponse();

  return {
    items: body.items.map(parseMenu),
    page: integer(body.page) + 1,
    size: integer(body.size),
    totalElements: integer(body.totalElements),
    totalPages: Math.max(1, integer(body.totalPages)),
  };
}

// 없거나 숨긴 메뉴는 null이다.
export async function getMenu(id: number): Promise<MenuResponse | null> {
  try {
    return parseMenu(await apiFetch<unknown>(`/api/v1/admin/menus/${id}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
