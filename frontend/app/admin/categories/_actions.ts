"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import { CATEGORY_NAME_MAX_LENGTH, isCategoryId } from "@/app/admin/_lib/categories/category";

export type CategoryFormState = { error?: string; values?: { name: string } };
export type CategoryActionResult = { error?: string };

const invalidRequest = "요청이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.";

// 카테고리는 관리자 메뉴 화면의 필터·폼과 공개 메뉴 탭에도 보인다.
function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menus", "layout");
  revalidatePath("/menus", "layout");
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > CATEGORY_NAME_MAX_LENGTH) return "카테고리명은 1~40자로 입력해 주세요.";
  return null;
}

// try는 API 호출만 감싼다. 백엔드가 거절한 요청만 메시지로 돌려주고, 나머지 예외는 error.tsx가 처리한다.
async function send(path: `/api/v1/${string}`, init: RequestInit): Promise<string | null> {
  try {
    await apiFetch<unknown>(path, { ...init, headers: await csrfHeaders() });
    return null;
  } catch (error) {
    if (error instanceof ApiRequestError) return error.error.message;
    throw error;
  }
}

export async function createCategory(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole("admin", "/admin/categories");
  const name = String(formData.get("name") ?? "");
  const values = { name };
  const error = validateName(name);
  if (error) return { error, values };

  const failure = await send("/api/v1/admin/categories", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
  if (failure) return { error: failure, values };
  refresh();
  return {};
}

export async function renameCategory(id: number, _previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole("admin", "/admin/categories");
  const name = String(formData.get("name") ?? "");
  const values = { name };
  if (!isCategoryId(id)) return { error: invalidRequest, values };
  const error = validateName(name);
  if (error) return { error, values };

  const failure = await send(`/api/v1/admin/categories/${id}`, { method: "PUT", body: JSON.stringify({ name: name.trim() }) });
  if (failure) return { error: failure, values };
  refresh();
  return {};
}

// 실패해도 목록을 다시 받지 않는다. 대화상자가 메시지를 보여 준 뒤 닫힐 때 화면이 새로고침한다.
export async function deleteCategory(id: number): Promise<CategoryActionResult> {
  await requireRole("admin", "/admin/categories");
  if (!isCategoryId(id)) return { error: invalidRequest };

  const failure = await send(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
  if (failure) return { error: failure };
  refresh();
  return {};
}

// ▲▼와 드래그 모두 화면의 새 순서 전체를 보낸다. 실패하면 서버 순서로 되돌리도록 목록도 다시 받는다.
export async function reorderCategories(orderedIds: number[]): Promise<CategoryActionResult> {
  await requireRole("admin", "/admin/categories");
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || !orderedIds.every(isCategoryId)) return { error: invalidRequest };

  const failure = await send("/api/v1/admin/categories/order", { method: "PUT", body: JSON.stringify({ orderedIds }) });
  refresh();
  return failure ? { error: failure } : {};
}
