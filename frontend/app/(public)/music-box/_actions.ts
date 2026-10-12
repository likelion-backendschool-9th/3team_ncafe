"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";

export type RequestFormState = { error?: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitMusicRequest(_previous: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const requesterName = field(formData, "requesterName");
  const songTitle = field(formData, "songTitle");
  const artist = field(formData, "artist");
  const story = field(formData, "story");

  if (!requesterName || requesterName.length > 30) return { error: "이름은 1~30자로 입력해 주세요." };
  if (!songTitle || songTitle.length > 100) return { error: "신청곡 제목은 1~100자로 입력해 주세요." };
  if (!artist || artist.length > 80) return { error: "가수 이름은 1~80자로 입력해 주세요." };
  if (!story || story.length > 500) return { error: "사연은 1~500자로 입력해 주세요." };

  try {
    await mockMusicBoxRepository.create({ requesterName, songTitle, artist, story });
  } catch {
    return { error: "신청곡을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/music-box");
  revalidatePath("/admin/music-box");
  redirect("/music-box?submitted=1");
}
