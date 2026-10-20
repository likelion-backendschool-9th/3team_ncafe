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

function refreshMusicBox(): void {
  for (const path of ["/", "/music-box", "/mypage/music-box", "/admin/music-box"]) revalidatePath(path);
}

// 손님 화면에서 지금 곡 영상이 끝나면 부른다. 그 곡이 아직 재생 중이고 서버 시각으로도 거의 끝났을 때만 다음 곡으로 넘긴다.
// 이미 다른 화면이나 서버가 넘겼더라도 이 화면이 새 곡을 받아 가도록 화면은 항상 새로 그린다.
export async function finishPlaying(id: string): Promise<void> {
  if (typeof id !== "string" || !id) return;
  await mockMusicBoxRepository.finishIfDue(id);
  refreshMusicBox();
}

// 영상 길이를 아직 모르는 곡을 재생한 화면이 읽은 길이를 알려 준다. 처음 알려 준 값만 기록한다.
export async function reportDuration(id: string, youtubeVideoId: string, durationSeconds: number): Promise<void> {
  if (typeof id !== "string" || typeof youtubeVideoId !== "string") return;
  if (await mockMusicBoxRepository.recordDuration(id, youtubeVideoId, durationSeconds)) refreshMusicBox();
}
