"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { getCurrentUser } from "@/app/_lib/session/session";

export type RequestFormState = { error?: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitMusicRequest(_previous: RequestFormState, formData: FormData): Promise<RequestFormState> {
  // 신청자는 폼 값이 아니라 세션에서 정한다. 화면에서 폼을 숨겨도 직접 요청할 수 있기 때문이다.
  const user = await getCurrentUser();
  if (!user) return { error: "신청곡은 로그인한 회원만 신청할 수 있습니다." };

  const songTitle = field(formData, "songTitle");
  const artist = field(formData, "artist");
  const story = field(formData, "story");

  if (!songTitle || songTitle.length > 100) return { error: "곡명은 1~100자로 입력해 주세요." };
  if (!artist || artist.length > 80) return { error: "가수 이름은 1~80자로 입력해 주세요." };
  if (!story || story.length > 500) return { error: "사연은 1~500자로 입력해 주세요." };

  try {
    await mockMusicBoxRepository.create({ userId: user.id, requesterName: user.name, songTitle, artist, story });
  } catch {
    return { error: "신청곡을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/music-box");
  revalidatePath("/admin/music-box");
  redirect("/music-box?submitted=1");
}
