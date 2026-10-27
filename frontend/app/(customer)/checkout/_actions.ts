"use server";

import { revalidatePath } from "next/cache";
import { ApiRequestError } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import { postCustomerOrder } from "./_lib/api";

type CreateOrderInput = {
  cartItemIds: number[];
  orderType: "dine-in" | "takeout";
  paymentMethod: "card" | "cash";
  request: string;
  expectedTotalAmount: number;
  idempotencyKey: string;
};

export type CreateCustomerOrderResult =
  | { ok: true; orderId: number }
  | { ok: false; message: string };

function parseInput(value: unknown): CreateOrderInput | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const cartItemIds = input.cartItemIds;
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0 || cartItemIds.length > 100
    || cartItemIds.some((id) => typeof id !== "number" || !Number.isSafeInteger(id) || id < 1)
    || new Set(cartItemIds).size !== cartItemIds.length
    || (input.orderType !== "dine-in" && input.orderType !== "takeout")
    || (input.paymentMethod !== "card" && input.paymentMethod !== "cash")
    || typeof input.request !== "string" || input.request.length > 100
    || typeof input.expectedTotalAmount !== "number" || !Number.isSafeInteger(input.expectedTotalAmount)
    || input.expectedTotalAmount < 0
    || typeof input.idempotencyKey !== "string" || !/^[\x21-\x7e]{1,100}$/.test(input.idempotencyKey)) return null;

  return {
    cartItemIds: cartItemIds as number[],
    orderType: input.orderType,
    paymentMethod: input.paymentMethod,
    request: input.request,
    expectedTotalAmount: input.expectedTotalAmount,
    idempotencyKey: input.idempotencyKey,
  };
}

function orderId(value: unknown): number {
  if (typeof value !== "object" || value === null) throw new Error("주문 응답 형식이 올바르지 않습니다.");
  const id = (value as Record<string, unknown>).id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) {
    throw new Error("주문 응답의 ID가 올바르지 않습니다.");
  }
  return id;
}

export async function createCustomerOrder(input: unknown): Promise<CreateCustomerOrderResult> {
  await requireRole("customer", "/checkout");
  const values = parseInput(input);
  if (!values) return { ok: false, message: "주문 내용을 확인해 주세요." };

  try {
    const created = await postCustomerOrder(values);
    const id = orderId(created);
    revalidatePath("/cart");
    revalidatePath("/my/orders");
    revalidatePath(`/my/orders/${id}`);
    return { ok: true, orderId: id };
  } catch (error) {
    if (error instanceof ApiRequestError) return { ok: false, message: error.error.message };
    throw error;
  }
}
