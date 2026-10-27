// 백엔드 dto/songs와 같은 이름·타입이다. 뮤직박스, 내 신청곡, 홈 뮤직박스 칸이 함께 쓴다.
export type SongStatus = "pending" | "queued" | "playing" | "played" | "cancelled";

export type SongResponse = {
  id: number;
  requesterName: string;
  songTitle: string;
  artist: string;
  story: string;
  status: SongStatus;
  youtubeVideoId: string | null;
  // 플레이리스트 안 순서. 작을수록 먼저 재생한다. 플레이리스트에 없으면 null.
  playlistOrder: number | null;
  createdAt: string;
  playedAt: string | null;
  startedAt: string | null;
  durationSeconds: number | null;
};

export type MusicBoxSongs = {
  // 재생 순서대로
  playlist: SongResponse[];
  // 먼저 신청한 순서대로
  inbox: SongResponse[];
  played: SongResponse[];
};

export type CurrentSong = Pick<SongResponse, "id" | "requesterName" | "songTitle" | "artist" | "story" | "youtubeVideoId" | "durationSeconds"> & {
  startedAt: string;
  // 길이를 모르면 null이다. 서버가 광고·버퍼링 여유 1초를 이미 더했다.
  endsAt: string | null;
};

export type NowPlaying = {
  current: CurrentSong | null;
  serverNow: string;
  // 뮤직박스가 바뀔 때마다 오른다. 열린 화면은 이 값만 확인하고, 달라지면 화면을 새로 받는다.
  revision: number;
};

// 플레이어에 넘기는 지금 곡의 재생 시각. serverNow는 응답 시점의 서버 시각으로, 손님 기기 시계가 틀려도 위치를 맞추게 한다.
export type OnAir = {
  startedAt: string;
  durationSeconds: number | null;
  endsAt: number | null;
  serverNow: number;
};

export function onAirOf(now: NowPlaying): OnAir | null {
  if (!now.current) return null;
  return {
    startedAt: now.current.startedAt,
    durationSeconds: now.current.durationSeconds,
    endsAt: now.current.endsAt === null ? null : Date.parse(now.current.endsAt),
    serverNow: Date.parse(now.serverNow),
  };
}

// 화면 검증은 백엔드 CreateSongRequest와 같은 규칙이다.
export const SONG_TITLE_MAX_LENGTH = 100;
export const ARTIST_MAX_LENGTH = 80;
export const STORY_MAX_LENGTH = 500;
