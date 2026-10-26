import "server-only";
import { cache } from "react";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import type { MenuCategoryResponse, MenuPageResponse, MenuResponse } from "./types";

// 화면이 아직 페이지 이동 없이 전체 메뉴를 보여 주므로 백엔드 최대 크기로 한 번에 받는다.
export const MENU_PAGE_SIZE = 100;

export type MenuListQuery = {
  q: string;
  categoryId: number | null;
  sort: string;
};

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

function flag(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalidResponse();
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : invalidResponse();
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
    available: flag(menu.available),
    isNew: flag(menu.isNew),
    recommended: flag(menu.recommended),
    supportsHot: flag(menu.supportsHot),
    supportsIced: flag(menu.supportsIced),
    createdAt: text(menu.createdAt),
    updatedAt: text(menu.updatedAt),
  };
}

function parseCategory(value: unknown): MenuCategoryResponse {
  const category = record(value);
  return { id: integer(category.id), name: text(category.name) };
}

export async function getMenus(query: MenuListQuery): Promise<MenuPageResponse> {
  const params = new URLSearchParams({ size: String(MENU_PAGE_SIZE), sort: query.sort });
  if (query.q) params.set("q", query.q);
  if (query.categoryId !== null) params.set("categoryId", String(query.categoryId));

  const body = record(await apiFetch<unknown>(`/api/v1/menus?${params}`));
  return {
    items: list(body.items).map(parseMenu),
    page: integer(body.page),
    size: integer(body.size),
    totalElements: integer(body.totalElements),
    totalPages: integer(body.totalPages),
  };
}

export async function getMenuCategories(): Promise<MenuCategoryResponse[]> {
  return list(await apiFetch<unknown>("/api/v1/menus/categories")).map(parseCategory);
}

// generateMetadata와 page가 같은 요청 안에서 한 번만 조회하도록 cache로 감싼다.
export const getMenu = cache(async (slug: string): Promise<MenuResponse | null> => {
  try {
    return parseMenu(await apiFetch<unknown>(`/api/v1/menus/${encodeURIComponent(slug)}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
});

export async function getRecommendedMenus(): Promise<MenuResponse[]> {
  return list(await apiFetch<unknown>("/api/v1/index/menus")).map(parseMenu);
}
