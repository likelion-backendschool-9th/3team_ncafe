"use server";

import { revalidatePath } from "next/cache";
import { updateMockUserStatus, type UserStatus } from "@/app/_lib/mock/users";
import { requireRole } from "@/app/_lib/session/session";

export type UserStatusState = { error?: string; success?: string };

function isUserStatus(value: FormDataEntryValue | null): value is UserStatus {
  return value === "active" || value === "suspended";
}

export async function changeUserStatus(
  id: string,
  _prev: UserStatusState,
  formData: FormData,
): Promise<UserStatusState> {
  await requireRole("admin", "/admin/users");
  const status = formData.get("status");
  const expectedStatus = formData.get("expectedStatus");
  if (typeof id !== "string" || !id || !isUserStatus(status) || !isUserStatus(expectedStatus)) {
    return { error: "회원 상태가 올바르지 않습니다. 다시 확인해 주세요." };
  }

  try {
    const result = updateMockUserStatus(id, status, expectedStatus);
    if (!result.ok) {
      const messages = {
        "not-found": "회원을 찾을 수 없습니다. 목록을 새로고침해 주세요.",
        protected: "관리자 계정의 상태는 변경할 수 없습니다.",
        conflict: "회원 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해 주세요.",
      };
      return { error: messages[result.error] };
    }
  } catch {
    return { error: "회원 상태를 변경하지 못했습니다. 다시 시도해 주세요." };
  }

  revalidatePath("/admin/users", "layout");
  return { success: status === "active" ? "회원의 이용 정지를 해제했습니다." : "회원의 이용을 정지했습니다." };
}
