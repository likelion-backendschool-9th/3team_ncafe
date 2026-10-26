"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError, csrfHeaders } from "@/app/_lib/api/client";
import { getCurrentUser } from "@/app/_lib/session/session";
import { ARTIST_MAX_LENGTH, SONG_TITLE_MAX_LENGTH, STORY_MAX_LENGTH } from "@/app/_lib/songs/types";

type Field = "songTitle" | "artist" | "story";

export type RequestFormState = {
  values: Record<Field, string>;
  errors: Partial<Record<Field, string>>;
  message?: string;
};

function readValues(formData: FormData): RequestFormState["values"] {
  const text = (name: Field) => String(formData.get(name) ?? "").trim();
  return { songTitle: text("songTitle"), artist: text("artist"), story: text("story") };
}

// 백엔드 CreateSongRequest와 같은 규칙이다. 필드 옆 오류를 보여 주려고 화면에서도 검사한다.
function validate(values: RequestFormState["values"]): RequestFormState["errors"] {
  const errors: RequestFormState["errors"] = {};
  if (!values.songTitle || values.songTitle.length > SONG_TITLE_MAX_LENGTH) errors.songTitle = "곡명은 1~100자로 입력해 주세요.";
  if (!values.artist || values.artist.length > ARTIST_MAX_LENGTH) errors.artist = "가수 이름은 1~80자로 입력해 주세요.";
  if (!values.story || values.story.length > STORY_MAX_LENGTH) errors.story = "사연은 1~500자로 입력해 주세요.";
  return errors;
}

export async function submitMusicRequest(_previous: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const values = readValues(formData);
  // 신청자는 폼 값이 아니라 세션에서 정한다. 화면에서 폼을 숨겨도 직접 요청할 수 있어 여기서 다시 확인한다.
  // 비로그인을 로그인 화면으로 보내지 않고 폼에 안내하는 것은, 신청 폼이 누구나 보는 뮤직박스 화면 안에 있기 때문이다.
  const user = await getCurrentUser();
  if (!user) return { values, errors: {}, message: "신청곡은 로그인한 회원만 보낼 수 있어요." };
  if (user.role !== "customer") return { values, errors: {}, message: "신청곡은 고객 회원만 보낼 수 있어요." };

  const errors = validate(values);
  if (Object.keys(errors).length > 0) return { values, errors };

  try {
    await apiFetch<unknown>("/api/v1/musicbox/songs", { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(values) });
  } catch (error) {
    if (error instanceof ApiRequestError) return { values, errors: {}, message: error.error.message };
    throw error;
  }
  refreshMusicBox();
  redirect("/musicbox?submitted=1");
}

function refreshMusicBox(): void {
  for (const path of ["/", "/musicbox", "/my/songs", "/admin/songs"]) revalidatePath(path);
}
