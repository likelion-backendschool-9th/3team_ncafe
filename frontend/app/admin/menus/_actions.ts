"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository, type MenuInput, type Temperature } from "@/app/_lib/mock/menus";
import { mockCategoryRepository } from "@/app/_lib/mock/categories";
import { requireRole } from "@/app/_lib/session/session";
import { saveMenuImage, UploadError } from "@/app/_lib/mock/uploads";

type Field = "name" | "nameEn" | "imageUrl" | "description" | "categories" | "price" | "available" | "isNew" | "recommended" | "tempHot" | "tempIce";

export type MenuFormState = {
  values: Record<Field, string>;
  errors: Partial<Record<Field, string>>;
  message?: string;
};

async function validate(formData: FormData, existingCategories: string[] = []): Promise<{ state: MenuFormState; input?: MenuInput }> {
  const selectedCategories = formData.getAll("categories").map((value) => String(value).trim()).filter(Boolean);
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    categories: selectedCategories.join(","),
    price: String(formData.get("price") ?? "").trim(),
    available: String(formData.get("available") ?? ""),
    isNew: formData.get("isNew") === "on" ? "true" : "false",
    recommended: formData.get("recommended") === "on" ? "true" : "false",
    tempHot: formData.get("tempHot") === "on" ? "true" : "false",
    tempIce: formData.get("tempIce") === "on" ? "true" : "false",
  };
  const errors: MenuFormState["errors"] = {};
  if (!values.name || values.name.length > 80) errors.name = "한글 메뉴명은 1~80자로 입력해 주세요.";
  if (!values.nameEn || values.nameEn.length > 80) errors.nameEn = "영문 메뉴명은 1~80자로 입력해 주세요.";
  if (values.imageUrl.length > 2048 || (values.imageUrl && !isValidImageUrl(values.imageUrl))) {
    errors.imageUrl = "HTTPS 이미지 주소나 /images/menus/ 경로를 입력해 주세요.";
  }
  if (!values.description || values.description.length > 500) errors.description = "설명은 1~500자로 입력해 주세요.";
  if (selectedCategories.length === 0) {
    errors.categories = "카테고리를 하나 이상 선택해 주세요.";
  } else {
    const availableCategories = (await mockCategoryRepository.list()).map((category) => category.name);
    const hasInvalidCategory = selectedCategories.some(
      (category) => !availableCategories.includes(category) && !existingCategories.includes(category),
    );
    if (hasInvalidCategory) errors.categories = "목록에 없는 카테고리가 선택되어 있습니다. 다시 선택해 주세요.";
  }
  const price = Number(values.price);
  if (!/^\d+$/.test(values.price) || !Number.isSafeInteger(price) || price < 1) {
    errors.price = "가격은 1원 이상의 정수로 입력해 주세요.";
  }
  if (values.available !== "true" && values.available !== "false") {
    errors.available = "판매 상태를 선택해 주세요.";
  }
  if (values.tempHot !== "true" && values.tempIce !== "true") {
    errors.tempHot = "핫 또는 아이스를 하나 이상 선택해 주세요.";
  }

  // 파일 업로드가 있으면 입력한 URL 대신 업로드한 파일을 우선 사용
  let resolvedImageUrl = values.imageUrl;
  const imageFile = formData.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      resolvedImageUrl = await saveMenuImage(imageFile);
      values.imageUrl = resolvedImageUrl;
    } catch (error) {
      errors.imageUrl = error instanceof UploadError ? error.message : "이미지 업로드에 실패했습니다.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { state: { values, errors } };
  }

  const temperatures: Temperature[] = [
    ...(values.tempHot === "true" ? (["hot"] as const) : []),
    ...(values.tempIce === "true" ? (["ice"] as const) : []),
  ];

  return {
    state: { values, errors },
    input: {
      name: values.name,
      nameEn: values.nameEn,
      imageUrl: resolvedImageUrl || MENU_IMAGE_PLACEHOLDER,
      description: values.description,
      categories: selectedCategories,
      price,
      available: values.available === "true",
      isNew: values.isNew === "true",
      recommended: values.recommended === "true",
      temperatures,
    },
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
  const { state, input } = await validate(formData);
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
  let existingCategories: string[] = [];
  try {
    existingCategories = (await mockMenuRepository.get(id))?.categories ?? [];
  } catch {
    return { ..._previous, message: "메뉴를 수정하지 못했습니다. 다시 시도해 주세요." };
  }
  const { state, input } = await validate(formData, existingCategories);
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
