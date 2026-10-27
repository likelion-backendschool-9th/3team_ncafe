import "server-only";

import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import type {
  CustomerOrderItemResponse,
  CustomerOrderPageResponse,
  CustomerOrderResponse,
  CustomerOrderStatus,
  CustomerOrderType,
  CustomerPaymentMethod,
  OrderTemperature,
} from "./types";

function invalidResponse(): never {
  throw new Error("주문 API 응답 형식이 올바르지 않습니다.");
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : invalidResponse();
}

function text(value: unknown): string {
  return typeof value === "string" ? value : invalidResponse();
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalidResponse();
}

function positiveInteger(value: unknown): number {
  const result = nonNegativeInteger(value);
  return result > 0 ? result : invalidResponse();
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

const statuses: readonly CustomerOrderStatus[] = ["received", "preparing", "ready", "completed", "canceled"];
const orderTypes: readonly CustomerOrderType[] = ["dine-in", "takeout"];
const paymentMethods: readonly CustomerPaymentMethod[] = ["card", "cash"];

function parseItem(value: unknown): CustomerOrderItemResponse {
  const item = record(value);
  if (item.temperature !== null && !isOneOf(item.temperature, ["hot", "iced"] as const)) invalidResponse();
  return {
    menuId: positiveInteger(item.menuId),
    menuName: text(item.menuName),
    imageUrl: text(item.imageUrl),
    temperature: item.temperature as OrderTemperature,
    unitPrice: nonNegativeInteger(item.unitPrice),
    quantity: positiveInteger(item.quantity),
    lineTotal: nonNegativeInteger(item.lineTotal),
  };
}

export function parseCustomerOrder(value: unknown): CustomerOrderResponse {
  const order = record(value);
  if (!isOneOf(order.status, statuses) || !isOneOf(order.orderType, orderTypes)
    || !isOneOf(order.paymentMethod, paymentMethods) || !Array.isArray(order.items)) invalidResponse();
  if (order.request !== null && typeof order.request !== "string") invalidResponse();
  if (order.cancelReason !== null && (typeof order.cancelReason !== "string" || !order.cancelReason.trim()
    || order.cancelReason.length > 200 || order.status !== "canceled")) invalidResponse();
  const createdAt = text(order.createdAt);
  if (!Number.isFinite(Date.parse(createdAt))) invalidResponse();
  return {
    id: positiveInteger(order.id),
    createdAt,
    status: order.status,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    request: order.request,
    cancelReason: order.cancelReason as string | null,
    totalAmount: nonNegativeInteger(order.totalAmount),
    items: order.items.map(parseItem),
  };
}

function parseOrderPage(value: unknown): CustomerOrderPageResponse {
  const page = record(value);
  if (!Array.isArray(page.items)) invalidResponse();
  return {
    items: page.items.map(parseCustomerOrder),
    page: nonNegativeInteger(page.page),
    size: positiveInteger(page.size),
    totalElements: nonNegativeInteger(page.totalElements),
    totalPages: nonNegativeInteger(page.totalPages),
  };
}

export async function getCustomerOrders(): Promise<CustomerOrderPageResponse> {
  return parseOrderPage(await apiFetch<unknown>("/api/v1/orders?page=0&size=100"));
}

export async function getCustomerOrder(id: string): Promise<CustomerOrderResponse | null> {
  try {
    return parseCustomerOrder(await apiFetch<unknown>(`/api/v1/orders/${id}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export { ApiRequestError };
