"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { MAX_CART_ITEM_QUANTITY } from "@/app/_lib/cart/constants";
import { requireRole } from "@/app/_lib/session/session";

export type CartItemActionResult = { ok: true } | { ok: false; message: string };

const isCartItemId = (id: number) => Number.isSafeInteger(id) && id > 0;

function failure(error: ApiRequestError): CartItemActionResult {
  // 다른 기기에서 지웠거나 남의 줄이면 404다. 화면을 다시 그려 지금 장바구니를 보여 준다.
  if (error.status === 404) revalidatePath("/cart");
  return { ok: false, message: error.status === 404 ? "이미 삭제된 항목입니다." : error.error.message };
}

export async function changeCartItemQuantity(id: number, quantity: number): Promise<CartItemActionResult> {
  await requireRole("customer", "/cart");
  if (!isCartItemId(id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_CART_ITEM_QUANTITY) {
    return { ok: false, message: "수량은 1~20개 사이로 선택해 주세요." };
  }

  try {
    await apiFetch(`/api/v1/cart/items/${id}`, {
      method: "PUT",
      headers: await csrfHeaders(),
      body: JSON.stringify({ quantity }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return failure(error);
    throw error;
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(id: number): Promise<CartItemActionResult> {
  await requireRole("customer", "/cart");
  if (!isCartItemId(id)) return { ok: false, message: "삭제할 항목이 올바르지 않습니다." };

  try {
    await apiFetch(`/api/v1/cart/items/${id}`, { method: "DELETE", headers: await csrfHeaders() });
  } catch (error) {
    if (error instanceof ApiRequestError) return failure(error);
    throw error;
  }

  revalidatePath("/cart");
  return { ok: true };
}
