"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";
import { parseYouTubeVideoId } from "@/app/_lib/youtube";

export type PlaybackFormState = { error?: string };

export async function startMusicRequest(id: string, _previous: PlaybackFormState, formData: FormData): Promise<PlaybackFormState> {
  await requireRole("admin", "/admin/music-box");
  const raw = formData.get("youtubeUrl");
  const link = typeof raw === "string" ? raw.trim() : "";
  const videoId = link.length <= 2048 ? parseYouTubeVideoId(link) : null;
  if (!videoId) {
    return { error: "YouTube 영상 링크를 넣어 주세요. (youtube.com/watch?v=…, youtu.be/…, 쇼츠 링크)" };
  }

  try {
    if (!await mockMusicBoxRepository.start(id, videoId)) {
      return { error: "대기 중인 신청곡을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
    }
  } catch {
    return { error: "신청곡을 선곡하지 못했습니다. 다시 시도해 주세요." };
  }
  revalidatePath("/");
  revalidatePath("/music-box");
  revalidatePath("/mypage/music-box");
  revalidatePath("/admin/music-box");
  redirect("/admin/music-box?started=1");
}

export async function finishMusicRequest(id: string): Promise<void> {
  await requireRole("admin", "/admin/music-box");
  await mockMusicBoxRepository.finish(id);
  revalidatePath("/");
  revalidatePath("/music-box");
  revalidatePath("/mypage/music-box");
  revalidatePath("/admin/music-box");
}
