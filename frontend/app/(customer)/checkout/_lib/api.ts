import "server-only";

import { apiFetch, csrfHeaders } from "@/app/_lib/api/client";

export type CreateOrderRequest = {
  cartItemIds: number[];
  orderType: "dine-in" | "takeout";
  paymentMethod: "card" | "cash";
  request: string;
  expectedTotalAmount: number;
  idempotencyKey: string;
};

export async function postCustomerOrder(input: CreateOrderRequest): Promise<unknown> {
  return apiFetch<unknown>("/api/v1/orders", {
    method: "POST",
    headers: { ...(await csrfHeaders()), "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      cartItemIds: input.cartItemIds,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod,
      request: input.request,
      expectedTotalAmount: input.expectedTotalAmount,
    }),
  });
}
