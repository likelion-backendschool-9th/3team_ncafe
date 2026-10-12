"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { MusicAudioUploadError, saveMusicAudio } from "@/app/_lib/mock/music-audio";
import { requireRole } from "@/app/_lib/session/session";

export type PlaybackFormState = { error?: string };

function validAudioUrl(value: string): boolean {
  if (/^\/audio\/[a-zA-Z0-9/_-]+\.(mp3|m4a|ogg|wav)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function startMusicRequest(id: string, _previous: PlaybackFormState, formData: FormData): Promise<PlaybackFormState> {
  await requireRole("admin", "/admin/music-box");
  const raw = formData.get("audioUrl");
  let audioUrl = typeof raw === "string" ? raw.trim() : "";
  const audioFile = formData.get("audioFile");
  const hasFile = audioFile instanceof File && audioFile.size > 0;
  if (!hasFile && (!audioUrl || audioUrl.length > 2048 || !validAudioUrl(audioUrl))) {
    return { error: "직접 재생할 수 있는 HTTPS 음원 주소 또는 /audio/ 파일 경로를 입력해 주세요." };
  }

  if (hasFile) {
    try {
      audioUrl = await saveMusicAudio(audioFile);
    } catch (error) {
      return { error: error instanceof MusicAudioUploadError ? error.message : "음원을 업로드하지 못했습니다." };
    }
  }

  try {
    if (!await mockMusicBoxRepository.start(id, audioUrl)) {
      return { error: "대기 중인 신청곡을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
    }
  } catch {
    return { error: "신청곡을 선곡하지 못했습니다. 다시 시도해 주세요." };
  }
  revalidatePath("/music-box");
  revalidatePath("/admin/music-box");
  redirect("/admin/music-box?started=1");
}

export async function finishMusicRequest(id: string): Promise<void> {
  await requireRole("admin", "/admin/music-box");
  await mockMusicBoxRepository.finish(id);
  revalidatePath("/music-box");
  revalidatePath("/admin/music-box");
}
