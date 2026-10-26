import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import type { CategoryResponse } from "./category";

function invalidResponse(): never {
  throw new Error("카테고리 API 응답 형식이 올바르지 않습니다.");
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

function parseCategory(value: unknown): CategoryResponse {
  const category = record(value);
  return {
    id: integer(category.id),
    name: text(category.name),
    displayOrder: integer(category.displayOrder),
    isFallback: bool(category.isFallback),
    menuCount: integer(category.menuCount),
    createdAt: text(category.createdAt),
    updatedAt: text(category.updatedAt),
  };
}

// 백엔드가 displayOrder 오름차순으로 돌려준다.
export async function getCategories(): Promise<CategoryResponse[]> {
  const body = await apiFetch<unknown>("/api/v1/admin/categories");
  if (!Array.isArray(body)) invalidResponse();
  return body.map(parseCategory);
}
