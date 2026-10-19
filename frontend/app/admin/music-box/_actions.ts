"use server";

import { revalidatePath } from "next/cache";
import { isValidDuration, mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
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

  // 미리보기 플레이어가 읽은 영상 길이. 아직 못 읽었으면 비어 있고, 나중에 재생한 화면이 채운다.
  const duration = Number(formData.get("durationSeconds"));
  const durationSeconds = isValidDuration(duration) ? duration : null;

  try {
    if (!await mockMusicBoxRepository.addToPlaylist(id, videoId, durationSeconds)) {
      return { error: "접수된 신청곡을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
    }
  } catch {
    return { error: "플레이리스트에 담지 못했습니다. 다시 시도해 주세요." };
  }
  refreshMusicBox();
  return {};
}

export async function returnToInbox(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.returnToInbox(id);
  refreshMusicBox();
}

export async function moveToPlayed(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.moveToPlayed(id);
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

// 화면에 보이던 곡(id)이 아직 재생 중일 때만 처리한다. 그사이 시간이 다 돼 다음 곡으로 넘어갔다면 다음 곡은 건드리지 않는다.
export async function finishCurrent(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.advance(id);
  refreshMusicBox();
}

export async function cancelCurrent(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.cancelCurrent(id);
  refreshMusicBox();
}

export async function cancelRequest(id: string): Promise<void> {
  await requireAdmin();
  await mockMusicBoxRepository.cancelRequest(id);
  refreshMusicBox();
}
