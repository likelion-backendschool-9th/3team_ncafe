"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import { isUserStatus, type UserResponse } from "./_lib/user";

export type UserStatusState = { error?: string; success?: string };

export async function changeUserStatus(id: number, _prev: UserStatusState, formData: FormData): Promise<UserStatusState> {
  await requireRole("admin", "/admin/users");
  const status = formData.get("status");
  if (!Number.isSafeInteger(id) || id < 1 || !isUserStatus(status)) {
    return { error: "회원 상태가 올바르지 않습니다. 다시 확인해 주세요." };
  }

  try {
    await apiFetch<UserResponse>(`/api/v1/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.status === 404 ? "회원을 찾을 수 없습니다. 목록을 새로고침해 주세요." : error.error.message };
    }
    throw error;
  }

  revalidatePath("/admin/users", "layout");
  return { success: status === "active" ? "회원의 이용 정지를 해제했습니다." : "회원의 이용을 정지했습니다." };
}
