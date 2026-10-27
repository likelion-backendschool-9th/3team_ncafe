"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { MAX_CART_ITEM_QUANTITY } from "@/app/_lib/cart/constants";
import { requireRole } from "@/app/_lib/session/session";
import type { Temperature } from "./_components/TemperaturePicker";

export type AddCartItemResult =
  | { ok: true }
  | { ok: false; needsLogin: boolean; message: string };

export async function addCartItem(
  menuId: number,
  menuSlug: string,
  temperature: Temperature | null,
  quantity: number,
): Promise<AddCartItemResult> {
  await requireRole("customer", `/menus/${menuSlug}`);
  if (!Number.isSafeInteger(menuId) || menuId < 1
    || !(temperature === null || temperature === "hot" || temperature === "ice")
    || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_CART_ITEM_QUANTITY) {
    return { ok: false, needsLogin: false, message: "담을 메뉴 정보가 올바르지 않습니다. 다시 선택해 주세요." };
  }

  try {
    await apiFetch("/api/v1/cart/items", {
      method: "POST",
      headers: await csrfHeaders(),
      // 화면은 hot/ice, 백엔드는 hot/iced를 쓴다.
      body: JSON.stringify({ menuId, temperature: temperature === "ice" ? "iced" : temperature, quantity }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { ok: false, needsLogin: error.status === 401, message: error.error.message };
    }
    throw error;
  }

  revalidatePath("/cart");
  return { ok: true };
}
