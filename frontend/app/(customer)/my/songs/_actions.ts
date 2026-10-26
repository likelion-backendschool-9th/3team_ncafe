"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";

const pagePath = "/my/songs";

export async function deleteMyMusicRequest(id: string): Promise<void> {
  const customer = await requireRole("customer", pagePath);
  const removed = await mockMusicBoxRepository.removeByUser(id, String(customer.id));
  if (!removed) redirect(`${pagePath}?error=delete`);

  revalidatePath("/");
  revalidatePath("/musicbox");
  revalidatePath("/admin/songs");
  revalidatePath(pagePath);
  redirect(`${pagePath}?deleted=1`);
}
