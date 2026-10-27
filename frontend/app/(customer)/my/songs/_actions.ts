"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";

const pagePath = "/my/songs";

export async function deleteMyMusicRequest(id: number): Promise<void> {
  await requireRole("customer", pagePath);
  try {
    await apiFetch<unknown>(`/api/v1/my/songs/${id}`, { method: "DELETE", headers: await csrfHeaders() });
  } catch (error) {
    // 없거나 남의 곡이면 404, 그사이 재생이 시작됐으면 409다.
    if (!(error instanceof ApiRequestError)) throw error;
    redirect(`${pagePath}?error=delete`);
  }

  for (const path of ["/", "/musicbox", "/admin/songs", pagePath]) revalidatePath(path);
  redirect(`${pagePath}?deleted=1`);
}
