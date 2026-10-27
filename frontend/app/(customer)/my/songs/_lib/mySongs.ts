import type { SongResponse, SongStatus } from "@/app/_lib/songs/types";

const statusOrder: Record<SongStatus, number> = { playing: 0, queued: 1, pending: 2, played: 3, cancelled: 4 };

export type MySong = { song: SongResponse; badge: string };

function badge(song: SongResponse, position: number | undefined): string {
  if (song.status === "playing") return "재생 중";
  if (song.status === "played") return "재생 완료";
  if (song.status === "cancelled") return "취소됨";
  if (song.status === "pending") return "접수됨";
  return position === undefined ? "재생 대기" : `재생 대기 ${position}`;
}

// 내 신청곡은 재생 중 → 플레이리스트(차례 순) → 접수 → 재생 완료 → 취소됨으로 보여 준다.
// 차례는 내 곡만으로는 알 수 없어 뮤직박스 전체 플레이리스트에서의 순번을 쓴다.
export function sortMySongs(mine: SongResponse[], playlist: SongResponse[]): MySong[] {
  const position = new Map(playlist.map((song, index) => [song.id, index + 1]));
  return [...mine]
    .sort((a, b) =>
      statusOrder[a.status] - statusOrder[b.status] ||
      (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
    )
    .map((song) => ({ song, badge: badge(song, position.get(song.id)) }));
}
