"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { mockOrderRepository, OrderError } from "@/app/_lib/mock/orders";
import { requireRole } from "@/app/_lib/session/session";

export async function cancelCustomerOrder(id: string): Promise<void> {
  const detailPath = `/orders/${encodeURIComponent(id)}`;
  const customer = await requireRole("customer", detailPath);

  try {
    await mockOrderRepository.cancelByCustomer(id, customer.id);
  } catch (error) {
    if (error instanceof OrderError && error.code === "NOT_FOUND") notFound();
    redirect(`${detailPath}?error=cancel`);
  }

  revalidatePath("/orders");
  revalidatePath(detailPath);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${encodeURIComponent(id)}`);
  redirect(`${detailPath}?canceled=1`);
}
