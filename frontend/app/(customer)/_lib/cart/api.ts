import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import type { CartItemResponse, CartItemsResponse, CartTemperature } from "./types";

function invalidResponse(): never {
  throw new Error("장바구니 API 응답 형식이 올바르지 않습니다.");
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

function temperature(value: unknown): CartTemperature | null {
  return value === null || value === "hot" || value === "iced" ? value : invalidResponse();
}

export function parseCartItem(value: unknown): CartItemResponse {
  const item = record(value);
  return {
    id: integer(item.id),
    menuId: integer(item.menuId),
    slug: text(item.slug),
    name: text(item.name),
    imageUrl: text(item.imageUrl),
    unitPrice: integer(item.unitPrice),
    temperature: temperature(item.temperature),
    quantity: integer(item.quantity),
    lineTotal: integer(item.lineTotal),
    orderable: flag(item.orderable),
  };
}

// 화면이 같은 요청 안에서 여러 번 불러도 백엔드 응답은 no-store라 매번 최신 장바구니를 읽는다.
export async function getCartItems(): Promise<CartItemsResponse> {
  const body = record(await apiFetch<unknown>("/api/v1/cart/items"));
  if (!Array.isArray(body.items)) invalidResponse();

  return {
    items: body.items.map(parseCartItem),
    totalQuantity: integer(body.totalQuantity),
    totalAmount: integer(body.totalAmount),
  };
}
