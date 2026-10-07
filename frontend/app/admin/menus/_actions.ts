"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository, type MenuInput } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { MENU_CATEGORIES } from "./_lib/menuCategories";

type Field = "name" | "nameEn" | "imageUrl" | "description" | "category" | "price" | "available" | "isNew" | "recommended";

export type MenuFormState = {
  values: Record<Field, string>;
  errors: Partial<Record<Field, string>>;
  message?: string;
};

function validate(formData: FormData, existingCategory?: string): { state: MenuFormState; input?: MenuInput } {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    available: String(formData.get("available") ?? ""),
    isNew: formData.get("isNew") === "on" ? "true" : "false",
    recommended: formData.get("recommended") === "on" ? "true" : "false",
  };
  const errors: MenuFormState["errors"] = {};
  if (!values.name || values.name.length > 80) errors.name = "한글 메뉴명은 1~80자로 입력해 주세요.";
  if (!values.nameEn || values.nameEn.length > 80) errors.nameEn = "영문 메뉴명은 1~80자로 입력해 주세요.";
  if (values.imageUrl.length > 2048 || (values.imageUrl && !isValidImageUrl(values.imageUrl))) {
    errors.imageUrl = "HTTPS 이미지 주소나 /images/menus/ 경로를 입력해 주세요.";
  }
  if (!values.description || values.description.length > 500) errors.description = "설명은 1~500자로 입력해 주세요.";
  if (!values.category || values.category.length > 40 || (!MENU_CATEGORIES.some((category) => category === values.category) && values.category !== existingCategory)) {
    errors.category = "목록에서 카테고리를 선택해 주세요.";
  }
  const price = Number(values.price);
  if (!/^\d+$/.test(values.price) || !Number.isSafeInteger(price) || price < 1) {
    errors.price = "가격은 1원 이상의 정수로 입력해 주세요.";
  }
  if (values.available !== "true" && values.available !== "false") {
    errors.available = "판매 상태를 선택해 주세요.";
  }
  return {
    state: { values, errors },
    input: Object.keys(errors).length === 0
      ? {
          name: values.name,
          nameEn: values.nameEn,
          imageUrl: values.imageUrl || MENU_IMAGE_PLACEHOLDER,
          description: values.description,
          category: values.category,
          price,
          available: values.available === "true",
          isNew: values.isNew === "true",
          recommended: values.recommended === "true",
        }
      : undefined,
  };
}

function isValidImageUrl(value: string): boolean {
  if (/^\/images\/menus\/[a-zA-Z0-9/_-]+\.(svg|png|jpe?g|webp)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function refreshMenus() {
  revalidatePath("/admin");
  revalidatePath("/admin/menus");
}

export async function createMenu(_previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", "/admin/menus/new");
  const { state, input } = validate(formData);
  if (!input) return state;

  let createdId: string;
  try {
    createdId = (await mockMenuRepository.create(input)).id;
  } catch {
    return { ...state, message: "메뉴를 등록하지 못했습니다. 다시 시도해 주세요." };
  }
  refreshMenus();
  redirect(`/admin/menus?created=${encodeURIComponent(createdId)}`);
}

export async function updateMenu(id: string, _previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", `/admin/menus/${id}/edit`);
  let existingCategory: string | undefined;
  try {
    existingCategory = (await mockMenuRepository.get(id))?.category;
  } catch {
    return { ..._previous, message: "메뉴를 수정하지 못했습니다. 다시 시도해 주세요." };
  }
  const { state, input } = validate(formData, existingCategory);
  if (!input) return state;

  let updated;
  try {
    updated = await mockMenuRepository.update(id, input);
  } catch {
    return { ...state, message: "메뉴를 수정하지 못했습니다. 다시 시도해 주세요." };
  }
  if (!updated) return { ...state, message: "수정할 메뉴를 찾을 수 없습니다." };
  refreshMenus();
  revalidatePath(`/admin/menus/${id}`);
  redirect(`/admin/menus/${id}?updated=1`);
}

export async function deleteMenu(id: string): Promise<void> {
  await requireRole("admin", `/admin/menus/${id}`);
  let removed;
  try {
    removed = await mockMenuRepository.remove(id);
  } catch {
    redirect(`/admin/menus/${id}?deleteError=1`);
  }
  if (!removed) redirect("/admin/menus?missing=1");
  refreshMenus();
  redirect("/admin/menus?deleted=1");
}
