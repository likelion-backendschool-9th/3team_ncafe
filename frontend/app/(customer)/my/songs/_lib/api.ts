import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import { parseSongs } from "@/app/_lib/songs/api";
import type { SongResponse } from "@/app/_lib/songs/types";

// 로그인한 고객 회원의 신청곡. 백엔드는 최신 신청순으로 준다.
export async function fetchMySongs(): Promise<SongResponse[]> {
  return parseSongs(await apiFetch<unknown>("/api/v1/my/songs"));
}
