"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiRequestError } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import { updateAdminOrderStatus } from "./_lib/api";
import { orderDetailHref, orderListHref, parseOrderReturnQuery, type OrderQuery } from "./_lib/searchParams";
import { isOrderStatus, isPositiveId, MAX_API_INTEGER, type OrderActionState, type OrderStatus } from "./_lib/types";

function returnQuery(value: unknown): OrderQuery {
  return parseOrderReturnQuery(typeof value === "string" ? value : "");
}
function returnPath(id: number, query: OrderQuery, detail: boolean): string {
  return detail && isPositiveId(id) ? orderDetailHref(id, query) : orderListHref(query);
}
function resultPath(path: string, key: string, value: string, focus?: string): string {
  const url = new URL(path, "http://internal.invalid");
  url.searchParams.set(key, value);
  if (focus === "completed" || focus === "canceled") url.searchParams.set("focus", focus);
  return url.pathname + url.search;
}
function refreshOrder(id: number): void {
  for (const path of ["/admin/orders", `/admin/orders/${id}`, "/my/orders", `/my/orders/${id}`, "/admin"]) revalidatePath(path);
}

async function update(id: number, expectedStatus: OrderStatus, statusVersion: number, query: OrderQuery,
  detail: boolean, formData: FormData): Promise<OrderActionState> {
  const nextStatus = formData.get("nextStatus");
  const value = isOrderStatus(nextStatus) ? nextStatus : undefined;
  if (!isPositiveId(id) || !isOrderStatus(expectedStatus) || !Number.isSafeInteger(statusVersion)
    || statusVersion < 0 || statusVersion > MAX_API_INTEGER || !value) {
    return { error: "주문 정보와 변경할 상태를 확인해 주세요.", value };
  }
  const path = returnPath(id, query, detail);
  let updated;
  try {
    updated = await updateAdminOrderStatus({ id, expectedStatus, statusVersion, nextStatus: value });
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    if (error.status === 401) redirect(`/login?next=${encodeURIComponent(path)}`);
    if (error.status === 403 && error.error.code !== "CSRF_INVALID") redirect("/forbidden");
    if (error.status === 404) {
      refreshOrder(id);
      redirect(resultPath(orderListHref(query), "error", "NOT_FOUND"));
    }
    if (error.status === 409 && ["STALE_STATUS", "INVALID_STATUS"].includes(error.error.code)) {
      refreshOrder(id);
      redirect(resultPath(path, "error", error.error.code));
    }
    return { error: error.error.code === "CSRF_INVALID" ? "세션을 확인하지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요."
      : error.status >= 500 ? "상태를 변경하지 못했습니다. 현재 주문 상태를 새로고침해 확인해 주세요." : error.message, value };
  }
  refreshOrder(id);
  redirect(resultPath(path, "updated", "1", detail ? undefined : updated.status));
}

export async function changeAdminOrderStatus(id: number, expectedStatus: OrderStatus, statusVersion: number,
  query: string, _previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireRole("admin", orderListHref(returnQuery(query)));
  return update(id, expectedStatus, statusVersion, returnQuery(query), false, formData);
}

export async function changeAdminOrderStatusFromDetail(id: number, expectedStatus: OrderStatus, statusVersion: number,
  query: string, _previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireRole("admin", returnPath(id, returnQuery(query), true));
  return update(id, expectedStatus, statusVersion, returnQuery(query), true, formData);
}
