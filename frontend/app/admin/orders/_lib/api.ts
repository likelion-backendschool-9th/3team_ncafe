import "server-only";
import { cookies } from "next/headers";
import { createAuthSession } from "@/app/_lib/api/auth";
import { ApiRequestError, BackendSession } from "@/app/_lib/api/backend-session";
import { parseAdminOrder, parseAdminOrderPage, type ChangeOrderStatusRequest, type OrderApiQuery } from "./types";

async function readSession(): Promise<BackendSession> {
  return new BackendSession((await cookies()).get("JSESSIONID")?.value, () => {});
}
export async function getAdminOrders(query: OrderApiQuery) {
  const params = new URLSearchParams({ group: query.group, page: String(query.page), size: String(query.size) });
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  return parseAdminOrderPage(await (await readSession()).requestJson(`/api/v1/admin/orders?${params}`));
}
export async function getAdminOrder(id: number) {
  try {
    return parseAdminOrder(await (await readSession()).requestJson(`/api/v1/admin/orders/${id}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
export async function updateAdminOrderStatus(request: ChangeOrderStatusRequest) {
  return parseAdminOrder(await (await createAuthSession()).requestJson("/api/v1/admin/orders/status", {
    method: "PUT", body: JSON.stringify(request),
  }));
}
