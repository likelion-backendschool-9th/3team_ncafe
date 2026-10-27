import "server-only";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { parseAdminOrder, parseAdminOrderPage, type ChangeOrderStatusRequest, type OrderApiQuery } from "./types";

export async function getAdminOrders(query: OrderApiQuery) {
  const params = new URLSearchParams({ group: query.group, page: String(query.page), size: String(query.size) });
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  return parseAdminOrderPage(await apiFetch<unknown>(`/api/v1/admin/orders?${params}`));
}
export async function getAdminOrder(id: number) {
  try {
    return parseAdminOrder(await apiFetch<unknown>(`/api/v1/admin/orders/${id}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
export async function updateAdminOrderStatus(request: ChangeOrderStatusRequest) {
  return parseAdminOrder(await apiFetch<unknown>("/api/v1/admin/orders/status", {
    method: "PUT", headers: await csrfHeaders(), body: JSON.stringify(request),
  }));
}
