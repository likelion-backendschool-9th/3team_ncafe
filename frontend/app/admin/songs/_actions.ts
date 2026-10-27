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

// 결과 없는 선곡 변경. 다른 화면이나 시간 경과로 곡 상태가 먼저 바뀌었으면(404·409) 오류 화면 대신 최신 목록을 보여 준다.
async function changeSong(path: `/api/v1/${string}`, init: RequestInit): Promise<void> {
  await requireAdmin();
  try {
    await apiFetch(path, { ...init, headers: await csrfHeaders() });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || ![404, 409].includes(error.status)) throw error;
  }
  refreshMusicBox();
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
  await changeSong(`/api/v1/admin/songs/${id}/return-to-inbox`, { method: "PUT" });
}

export async function moveToPlayed(id: number): Promise<void> {
  await changeSong(`/api/v1/admin/songs/${id}/move-to-played`, { method: "PUT" });
}

export async function moveInPlaylist(id: number, direction: "up" | "down"): Promise<void> {
  await changeSong(`/api/v1/admin/songs/playlist/${id}/order`, { method: "PUT", body: JSON.stringify({ direction }) });
}

export async function playNow(id: number): Promise<void> {
  await changeSong(`/api/v1/admin/songs/playlist/${id}/play`, { method: "POST" });
}

export async function finishCurrent(id: number): Promise<void> {
  await changeSong("/api/v1/admin/songs/current/finish", { method: "POST", body: JSON.stringify({ id }) });
}

export async function cancelCurrent(id: number): Promise<void> {
  await changeSong("/api/v1/admin/songs/current/cancel", { method: "POST", body: JSON.stringify({ id }) });
}

export async function cancelRequest(id: number): Promise<void> {
  await changeSong(`/api/v1/admin/songs/${id}/cancel`, { method: "PUT" });
}
