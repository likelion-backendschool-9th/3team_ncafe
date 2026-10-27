"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import { parseYouTubeVideoId } from "@/app/_lib/youtube";

const pagePath = "/admin/songs";

export type PlaylistFormState = { error?: string };

async function requireAdmin(): Promise<void> {
  await requireRole("admin", pagePath);
}

function refreshMusicBox(): void {
  for (const path of ["/", "/musicbox", "/my/songs", pagePath]) revalidatePath(path);
}

export async function addToPlaylist(id: number, _previous: PlaylistFormState, formData: FormData): Promise<PlaylistFormState> {
  await requireAdmin();
  const raw = formData.get("youtubeUrl");
  const link = typeof raw === "string" ? raw.trim() : "";
  const videoId = link.length <= 2048 ? parseYouTubeVideoId(link) : null;
  if (!videoId) {
    return { error: "YouTube 영상 링크를 넣어 주세요. (youtube.com/watch?v=…, youtu.be/…, 쇼츠 링크)" };
  }

  const duration = Number(formData.get("durationSeconds"));
  const durationSeconds = Number.isFinite(duration) && duration > 0 ? duration : null;

  try {
    await apiFetch("/api/v1/admin/songs/playlist", {
      method: "POST",
      headers: await csrfHeaders(),
      body: JSON.stringify({ songId: id, youtubeVideoId: videoId, durationSeconds }),
    });
  } catch (e) {
    if (e instanceof ApiRequestError) return { error: e.error.message };
    return { error: "플레이리스트에 담지 못했습니다. 다시 시도해 주세요." };
  }
  refreshMusicBox();
  return {};
}

export async function returnToInbox(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch(`/api/v1/admin/songs/${id}/return-to-inbox`, {
    method: "PUT",
    headers: await csrfHeaders(),
  });
  refreshMusicBox();
}

export async function moveToPlayed(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch(`/api/v1/admin/songs/${id}/move-to-played`, {
    method: "PUT",
    headers: await csrfHeaders(),
  });
  refreshMusicBox();
}

export async function moveInPlaylist(id: number, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await apiFetch(`/api/v1/admin/songs/playlist/${id}/order`, {
    method: "PUT",
    headers: await csrfHeaders(),
    body: JSON.stringify({ direction }),
  });
  refreshMusicBox();
}

export async function playNow(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch(`/api/v1/admin/songs/playlist/${id}/play`, {
    method: "POST",
    headers: await csrfHeaders(),
  });
  refreshMusicBox();
}

export async function finishCurrent(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch("/api/v1/admin/songs/current/finish", {
    method: "POST",
    headers: await csrfHeaders(),
    body: JSON.stringify({ id }),
  });
  refreshMusicBox();
}

export async function cancelCurrent(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch("/api/v1/admin/songs/current/cancel", {
    method: "POST",
    headers: await csrfHeaders(),
    body: JSON.stringify({ id }),
  });
  refreshMusicBox();
}

export async function cancelRequest(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch(`/api/v1/admin/songs/${id}/cancel`, {
    method: "PUT",
    headers: await csrfHeaders(),
  });
  refreshMusicBox();
}
