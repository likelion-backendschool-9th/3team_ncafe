"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockOrderRepository, OrderError } from "@/app/_lib/mock/orders";
import type { OrderStatus } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";

function destination(query: string, result: string, nextStatus?: OrderStatus): string {
  const source = new URLSearchParams(query);
  const params = new URLSearchParams();
  for (const key of ["q", "status", "sort", "view", "activePage", "completedPage", "canceledPage"]) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  if (result === "updated" && (nextStatus === "completed" || nextStatus === "canceled")) {
    params.set("focus", nextStatus);
  }
  params.set(result === "updated" ? "updated" : "error", result === "updated" ? "1" : result);
  return `/admin/orders?${params.toString()}`;
}

function detailDestination(id: string, query: string, result: string): string {
  const source = new URLSearchParams(query);
  const params = new URLSearchParams();
  for (const key of ["q", "status", "sort", "view", "activePage", "completedPage", "canceledPage"]) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  params.set(result === "updated" ? "updated" : "error", result === "updated" ? "1" : result);
  return `/admin/orders/${encodeURIComponent(id)}?${params.toString()}`;
}

export async function changeAdminOrderStatus(
  id: string,
  expectedStatus: OrderStatus,
  query: string,
  formData: FormData,
): Promise<void> {
  await requireRole("admin", "/admin/orders");
  const nextStatus = String(formData.get("nextStatus") ?? "") as OrderStatus;
  const cancelReason = String(formData.get("cancelReason") ?? "");
  try {
    await mockOrderRepository.changeStatus(id, expectedStatus, nextStatus, cancelReason);
  } catch (error) {
    const code = error instanceof OrderError ? error.code : "UNKNOWN";
    redirect(destination(query, code));
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/my/orders");
  revalidatePath(`/my/orders/${id}`);
  redirect(destination(query, "updated", nextStatus));
}

export async function changeAdminOrderStatusFromDetail(
  id: string,
  expectedStatus: OrderStatus,
  query: string,
  formData: FormData,
): Promise<void> {
  await requireRole("admin", `/admin/orders/${encodeURIComponent(id)}`);
  const nextStatus = String(formData.get("nextStatus") ?? "") as OrderStatus;
  const cancelReason = String(formData.get("cancelReason") ?? "");
  try {
    await mockOrderRepository.changeStatus(id, expectedStatus, nextStatus, cancelReason);
  } catch (error) {
    const code = error instanceof OrderError ? error.code : "UNKNOWN";
    redirect(detailDestination(id, query, code));
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/my/orders");
  revalidatePath(`/my/orders/${id}`);
  redirect(detailDestination(id, query, "updated"));
}
