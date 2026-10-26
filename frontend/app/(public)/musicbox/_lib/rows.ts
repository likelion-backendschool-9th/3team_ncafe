import type { MusicBoxSongs, NowPlaying, SongResponse } from "@/app/_lib/songs/types";

// 표 한 줄. 재생 중인 곡 응답에는 신청 시각이 없어 createdAt이 null이다.
export type RequestRow = {
  request: Pick<SongResponse, "id" | "songTitle" | "artist" | "requesterName" | "story" | "status"> & { createdAt: string | null };
  // 대기 중인 곡의 순번(1부터). 대기 중이 아니면 null.
  queuePosition: number | null;
};

const seoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

// 목록은 재생 중 → 플레이리스트 → 접수 → 재생 완료 순서다. 취소된 신청은 응답에 없다.
export function requestRows({ playlist, inbox, played }: MusicBoxSongs, current: NowPlaying["current"]): RequestRow[] {
  return [
    ...(current ? [{ request: { ...current, status: "playing" as const, createdAt: null }, queuePosition: null }] : []),
    ...playlist.map((request, index) => ({ request, queuePosition: index + 1 })),
    ...inbox.map((request) => ({ request, queuePosition: null })),
    ...played.map((request) => ({ request, queuePosition: null })),
  ];
}

// 서울 날짜로 오늘(serverNow 기준) 접수된 곡 수. 재생 완료는 백엔드가 최근 20곡만 주므로 그 안에서 센다.
export function todayCount(rows: RequestRow[], serverNow: string): number {
  const today = seoulDate.format(new Date(serverNow));
  return rows.filter(({ request }) => request.createdAt !== null && seoulDate.format(new Date(request.createdAt)) === today).length;
}
