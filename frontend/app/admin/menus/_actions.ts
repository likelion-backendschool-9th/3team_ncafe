"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import {
  MENU_DESCRIPTION_MAX_LENGTH, MENU_IMAGE_PLACEHOLDER, MENU_IMAGE_URL_MAX_LENGTH, MENU_IMAGE_URL_PATTERN, MENU_NAME_MAX_LENGTH,
  MENU_PRICE_MAX, MENU_PRICE_MIN, MENU_SLUG_MAX_LENGTH, MENU_SLUG_PATTERN,
} from "./_lib/menu";
import { parseMenuId } from "./_lib/searchParams";

type Field = "slug" | "name" | "imageUrl" | "description" | "categoryId" | "price" | "available" | "isNew" | "recommended" | "supportsHot" | "supportsIced";

export type MenuFormState = {
  values: Record<Field, string>;
  errors: Partial<Record<Field, string>>;
  message?: string;
};

function readValues(formData: FormData): MenuFormState["values"] {
  const text = (name: Field) => String(formData.get(name) ?? "").trim();
  const checked = (name: Field) => (formData.get(name) === "on" ? "true" : "false");
  return {
    slug: text("slug"),
    name: text("name"),
    imageUrl: text("imageUrl"),
    description: text("description"),
    categoryId: text("categoryId"),
    price: text("price"),
    available: text("available"),
    isNew: checked("isNew"),
    recommended: checked("recommended"),
    supportsHot: checked("supportsHot"),
    supportsIced: checked("supportsIced"),
  };
}

// 백엔드 Bean Validation과 같은 규칙·문구다. 수정 요청에는 slug가 없어 검사하지 않는다.
function validate(values: MenuFormState["values"], withSlug: boolean): MenuFormState["errors"] {
  const errors: MenuFormState["errors"] = {};
  if (withSlug) {
    if (!values.slug) errors.slug = "slug를 입력해 주세요.";
    else if (values.slug.length > MENU_SLUG_MAX_LENGTH) errors.slug = "slug는 100자 이하로 입력해 주세요.";
    else if (!MENU_SLUG_PATTERN.test(values.slug)) errors.slug = "slug는 소문자·숫자·하이픈만 사용할 수 있습니다.";
  }
  if (!values.name) errors.name = "메뉴명을 입력해 주세요.";
  else if (values.name.length > MENU_NAME_MAX_LENGTH) errors.name = "메뉴명은 80자 이하로 입력해 주세요.";
  if (!values.description) errors.description = "설명을 입력해 주세요.";
  else if (values.description.length > MENU_DESCRIPTION_MAX_LENGTH) errors.description = "설명은 500자 이하로 입력해 주세요.";
  if (values.imageUrl && (values.imageUrl.length > MENU_IMAGE_URL_MAX_LENGTH || !MENU_IMAGE_URL_PATTERN.test(values.imageUrl))) {
    errors.imageUrl = "HTTPS 이미지 주소나 /images/menus/ 경로를 입력해 주세요.";
  }
  if (parseMenuId(values.categoryId) === null) errors.categoryId = "카테고리를 선택해 주세요.";
  const price = Number(values.price);
  if (!/^\d+$/.test(values.price) || price < MENU_PRICE_MIN || price > MENU_PRICE_MAX) {
    errors.price = "가격은 1~1,000,000원으로 입력해 주세요.";
  }
  if (values.available !== "true" && values.available !== "false") errors.available = "판매 상태를 선택해 주세요.";
  return errors;
}

function toRequest(values: MenuFormState["values"]) {
  return {
    categoryId: Number(values.categoryId),
    name: values.name,
    description: values.description,
    imageUrl: values.imageUrl || MENU_IMAGE_PLACEHOLDER,
    price: Number(values.price),
    available: values.available === "true",
    isNew: values.isNew === "true",
    recommended: values.recommended === "true",
    supportsHot: values.supportsHot === "true",
    supportsIced: values.supportsIced === "true",
  };
}

// 백엔드가 거절한 이유를 해당 입력란에 붙인다. slug 중복은 409, 없는 카테고리는 400 INVALID_INPUT이다.
function rejected(values: MenuFormState["values"], error: ApiRequestError): MenuFormState {
  if (error.status === 409) return { values, errors: { slug: error.error.message } };
  if (error.error.code === "INVALID_INPUT") return { values, errors: { categoryId: error.error.message } };
  return { values, errors: {}, message: error.error.message };
}

// 메뉴 수는 카테고리 화면에, 메뉴 자체는 공개 메뉴 화면에도 보인다.
function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/menus", "layout");
  revalidatePath("/admin/categories");
  revalidatePath("/menus", "layout");
}

// try는 API 호출만 감싼다. 백엔드가 거절한 요청만 폼으로 돌려주고, 나머지 예외는 error.tsx가 처리한다.
export async function createMenu(_previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", "/admin/menus/new");
  const values = readValues(formData);
  const errors = validate(values, true);
  if (Object.keys(errors).length > 0) return { values, errors };

  let created: { id: number };
  try {
    created = await apiFetch<{ id: number }>("/api/v1/admin/menus", {
      method: "POST",
      headers: await csrfHeaders(),
      body: JSON.stringify({ slug: values.slug, ...toRequest(values) }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return rejected(values, error);
    throw error;
  }
  refresh();
  redirect(`/admin/menus?created=${created.id}`);
}

export async function updateMenu(id: number, previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", `/admin/menus/${id}/edit`);
  // slug는 바꿀 수 없으므로 화면에 보이던 값을 그대로 유지한다.
  const values = { ...readValues(formData), slug: previous.values.slug };
  if (parseMenuId(String(id)) === null) return { values, errors: {}, message: "수정할 메뉴를 찾을 수 없습니다." };
  const errors = validate(values, false);
  if (Object.keys(errors).length > 0) return { values, errors };

  try {
    await apiFetch<unknown>(`/api/v1/admin/menus/${id}`, {
      method: "PUT",
      headers: await csrfHeaders(),
      body: JSON.stringify(toRequest(values)),
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return { values, errors: {}, message: "수정할 메뉴를 찾을 수 없습니다." };
    if (error instanceof ApiRequestError) return rejected(values, error);
    throw error;
  }
  refresh();
  redirect(`/admin/menus/${id}?updated=1`);
}

// 백엔드 삭제는 메뉴를 숨긴다. 이미 숨겨졌거나 없으면 404다.
export async function deleteMenu(id: number): Promise<void> {
  await requireRole("admin", `/admin/menus/${id}`);
  if (parseMenuId(String(id)) === null) redirect("/admin/menus?missing=1");

  let status: number | null = null;
  try {
    await apiFetch<unknown>(`/api/v1/admin/menus/${id}`, { method: "DELETE", headers: await csrfHeaders() });
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    status = error.status;
  }
  if (status === 404) redirect("/admin/menus?missing=1");
  if (status !== null) redirect(`/admin/menus/${id}?deleteError=1`);
  refresh();
  redirect("/admin/menus?deleted=1");
}
