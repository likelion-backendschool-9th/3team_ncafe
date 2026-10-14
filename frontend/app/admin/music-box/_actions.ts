"use server";

import { revalidatePath } from "next/cache";
import { mockMusicBoxRepository, type RepeatMode } from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";
import { parseYouTubeVideoId } from "@/app/_lib/youtube";

const pagePath = "/admin/music-box";

export type PlaylistFormState = { error?: string };

async function requireAdmin(): Promise<void> {
  await requireRole("admin", pagePath);
}

// 뮤직박스 상태가 바뀌면 DJ 부스·신청곡 목록을 보여 주는 화면을 모두 새로 그린다.
function refreshMusicBox(): void {
  for (const path of ["/", "/music-box", "/mypage/music-box", pagePath]) revalidatePath(path);
}

export async function addToPlaylist(id: string, _previous: PlaylistFormState, formData: FormData): Promise<PlaylistFormState> {
  await requireAdmin();
  const raw = formData.get("youtubeUrl");
  const link = typeof raw === "string" ? raw.trim() : "";
  const videoId = link.length <= 2048 ? parseYouTubeVideoId(link) : null;
  if (!videoId) {
    return { error: "YouTube 영상 링크를 넣어 주세요. (youtube.com/watch?v=…, youtu.be/…, 쇼츠 링크)" };
  }

  try {
    if (!await mockMusicBoxRepository.addToPlaylist(id, videoId)) {
      return { error: "접수된 신청곡을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
    }
  } catch {
    return { error: "플레이리스트에 담지 못했습니다. 다시 시도해 주세요." };
  }
  refreshMusicBox();
  return {};
}

export async function removeFromPlaylist(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.removeFromPlaylist(id);
  refreshMusicBox();
}

export async function moveInPlaylist(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.moveInPlaylist(id, direction);
  refreshMusicBox();
}

export async function playNow(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.playNow(id);
  refreshMusicBox();
}

export async function finishCurrent(): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.advance();
  refreshMusicBox();
}

export async function cancelCurrent(): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.cancelCurrent();
  refreshMusicBox();
}

export async function cancelRequest(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.cancelRequest(id);
  refreshMusicBox();
}

const repeatModes: RepeatMode[] = ["off", "one", "all"];

export async function setRepeatMode(mode: RepeatMode): Promise<void> {
  await requireAdmin();
  if (!repeatModes.includes(mode)) return;
  await mockMusicBoxRepository.setRepeatMode(mode);
  refreshMusicBox();
}
