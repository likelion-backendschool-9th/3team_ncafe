"use server";

import { revalidatePath } from "next/cache";
import { mockOrderRepository, OrderError } from "@/app/_lib/mock/orders";
import type { CreateOrderInput } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";

export type CreateCustomerOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

export async function createCustomerOrder(input: CreateOrderInput): Promise<CreateCustomerOrderResult> {
  const customer = await requireRole("customer", "/checkout");

  let order;
  try {
    order = await mockOrderRepository.create(customer, input);
  } catch (error) {
    if (error instanceof OrderError) {
      if (error.code === "PRICE_CHANGED") {
        return { ok: false, message: "메뉴 가격이 변경되었습니다. 해당 메뉴를 다시 담아 주세요." };
      }
      if (error.code === "MENU_UNAVAILABLE") {
        return { ok: false, message: "판매하지 않는 메뉴가 포함되어 있습니다. 해당 메뉴를 장바구니에서 빼고 다시 주문해 주세요." };
      }
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "주문을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  return { ok: true, orderId: order.id };
}
