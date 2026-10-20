"use server";

import { revalidatePath } from "next/cache";
import { FALLBACK_CATEGORY_NAME, mockCategoryRepository } from "@/app/_lib/mock/categories";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";

export type CategoryFormState = { error?: string };

function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menus");
  revalidatePath("/admin/menus/new");
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) return "카테고리명은 1~40자로 입력해 주세요.";
  return null;
}

export async function createCategory(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole("admin", "/admin/categories");
  const name = String(formData.get("name") ?? "");
  const error = validateName(name);
  if (error) return { error };

  try {
    await mockCategoryRepository.create(name);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리를 추가하지 못했습니다." };
  }
  refresh();
  return {};
}

export async function renameCategory(id: string, _previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole("admin", "/admin/categories");
  const name = String(formData.get("name") ?? "");
  const error = validateName(name);
  if (error) return { error };

  try {
    const updated = await mockCategoryRepository.rename(id, name);
    if (!updated) return { error: "수정할 카테고리를 찾을 수 없습니다." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리를 수정하지 못했습니다." };
  }
  refresh();
  return {};
}

export async function deleteCategory(id: string): Promise<CategoryFormState> {
  await requireRole("admin", "/admin/categories");
  try {
    const removed = await mockCategoryRepository.remove(id);
    if (!removed) return { error: "삭제할 카테고리를 찾을 수 없습니다." };
    // 지운 카테고리를 쓰던 메뉴는 메뉴판에서 사라지지 않게 기타로 옮긴다.
    await mockMenuRepository.replaceCategory(removed.name, FALLBACK_CATEGORY_NAME);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리를 삭제하지 못했습니다." };
  }
  refresh();
  revalidatePath("/menus", "layout");
  return {};
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<void> {
  await requireRole("admin", "/admin/categories");
  await mockCategoryRepository.move(id, direction);
  refresh();
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await requireRole("admin", "/admin/categories");
  await mockCategoryRepository.reorder(orderedIds);
  refresh();
}
