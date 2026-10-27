import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import { integer, object, parseCurrent, parseSongs, text } from "@/app/_lib/songs/api";
import type { NowPlaying, SongResponse } from "@/app/_lib/songs/types";

// 홈 뮤직박스 칸. 지금 곡과 사연, 다음 차례 몇 곡과 플레이리스트 전체 곡 수를 한 번에 받는다.
export type IndexSongs = NowPlaying & {
  nextUp: SongResponse[];
  playlistCount: number;
};

export async function fetchIndexSongs(): Promise<IndexSongs> {
  const body = object(await apiFetch<unknown>("/api/v1/index/songs"));
  return {
    current: parseCurrent(body.current),
    nextUp: parseSongs(body.nextUp),
    playlistCount: integer(body.playlistCount),
    serverNow: text(body.serverNow),
    revision: integer(body.revision),
  };
}
