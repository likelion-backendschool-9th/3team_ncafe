import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

// 접수(pending) → 관리자가 링크를 붙여 플레이리스트에 담음(queued) → 재생 중(playing) → 재생 완료(played).
// 관리자가 접수를 취소하면 cancelled로 남겨 신청자가 마이페이지에서 볼 수 있게 한다.
export type MusicRequestStatus = "pending" | "queued" | "playing" | "played" | "cancelled";
export type RepeatMode = "off" | "one" | "all";

export type MusicRequest = {
  id: string;
  // 신청한 회원. 회원 전용 신청 이전에 쌓인 목 데이터에는 없을 수 있다.
  userId: string | null;
  requesterName: string;
  songTitle: string;
  artist: string;
  story: string;
  status: MusicRequestStatus;
  // 관리자가 붙인 YouTube 영상 ID(11자리). 플레이리스트에 담기 전에는 없을 수 있다.
  youtubeVideoId: string | null;
  // 플레이리스트 안에서의 순서. 작을수록 먼저 재생한다. 플레이리스트에 없으면 null.
  playlistOrder: number | null;
  createdAt: string;
  playedAt: string | null;
};

export type MusicRequestInput = Pick<MusicRequest, "userId" | "requesterName" | "songTitle" | "artist" | "story">;

const fileName = "music-requests.json";
const settingsFileName = "music-box-settings.json";

type SeedRequest = Pick<MusicRequest, "songTitle" | "artist" | "requesterName" | "story" | "status">;

// 화면 확인용 목 데이터. 첫 곡은 재생 중, 다음 4곡은 접수, 나머지는 재생 완료 상태로 시작한다.
// 재생 중인 곡도 영상 없이 시작하므로, 관리자 화면에서 재생 완료 후 링크를 붙여 플레이리스트에 담으면 된다.
const seedRequests: SeedRequest[] = [
  { songTitle: "서른 즈음에", artist: "김광석", requesterName: "하늘바람", status: "playing", story: "지친 하루 끝에 다방에 들렀다가 이 노래를 들으니 큰 위로가 되네요. 오늘도 수고한 모두에게 이 노래를 보냅니다." },
  { songTitle: "가을이 오면", artist: "이문세", requesterName: "커피좋아", status: "pending", story: "창밖에 낙엽이 떨어지는 걸 보니 대학 시절 친구들과 통기타 치며 부르던 이 노래가 생각나요. 그 친구들도 어디선가 듣고 있으면 좋겠습니다." },
  { songTitle: "그대 그리고 나", artist: "소리새", requesterName: "다방지기", status: "pending", story: "아버지가 어머니께 처음 고백하던 날 다방에서 흘러나왔다는 노래입니다. 두 분 결혼 40주년을 맞아 신청합니다." },
  { songTitle: "나는 나비", artist: "윤도현", requesterName: "추억여행", status: "pending", story: "이직 준비로 지친 동생에게 힘내라고 보내는 노래예요. 너는 언젠가 꼭 날아오를 거야!" },
  { songTitle: "붉은 노을", artist: "이문세", requesterName: "노을빛", status: "pending", story: "퇴근길 버스 창밖으로 노을이 예뻐서 생각났어요. 다들 오늘 하루 고생 많으셨습니다." },
  { songTitle: "아름다운 구속", artist: "김종서", requesterName: "여름향기", status: "played", story: "결혼식 축가로 불렀던 노래인데, 오늘이 결혼 10주년이라 아내와 함께 다시 듣고 싶어요." },
  { songTitle: "사랑으로", artist: "해바라기", requesterName: "봄비", status: "played", story: "멀리 계신 부모님께 고마운 마음을 전하고 싶어서 신청합니다." },
  { songTitle: "광화문 연가", artist: "이문세", requesterName: "덕수궁", status: "played", story: "돌담길을 한참 걷다가 들어왔어요. 이 노래가 딱 어울리는 날이네요." },
  { songTitle: "바람이 불어오는 곳", artist: "김광석", requesterName: "여행자", status: "played", story: "다음 주에 혼자 첫 여행을 떠납니다. 설레는 마음으로 신청해요." },
  { songTitle: "너의 의미", artist: "산울림", requesterName: "산책", status: "played", story: "오래된 친구에게. 늘 곁에 있어 줘서 고마워." },
  { songTitle: "행복의 나라로", artist: "한대수", requesterName: "나그네", status: "played", story: "여기 계신 모든 분들 오늘 하루 행복하세요." },
];

function seed(): MusicRequest[] {
  const now = Date.now();
  // 접수함은 먼저 신청한 순서이므로 목록 위쪽 곡일수록 먼저 신청한 것으로 둔다.
  return seedRequests.map((request, index) => {
    const minutesAgo = request.status === "played" ? 120 + index * 15 : 100 - index * 15;
    return {
      ...request,
      id: randomUUID(),
      userId: null,
      youtubeVideoId: null,
      playlistOrder: null,
      createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
      playedAt: request.status === "played" ? new Date(now - (index - 4) * 12 * 60_000).toISOString() : null,
    };
  });
}

// 예전 목 데이터(audioUrl로 저장하던 것, 플레이리스트가 없던 것)도 그대로 읽도록 빠진 값을 채운다.
type StoredMusicRequest = Omit<MusicRequest, "youtubeVideoId" | "playlistOrder"> & {
  youtubeVideoId?: string | null;
  playlistOrder?: number | null;
  audioUrl?: unknown;
};

function requests(): MusicRequest[] {
  return readMockData<StoredMusicRequest[]>(fileName, seed).map(({ audioUrl: _legacy, ...request }) => ({
    ...request,
    youtubeVideoId: request.youtubeVideoId ?? null,
    playlistOrder: request.playlistOrder ?? null,
  }));
}

function byCreatedAt(a: MusicRequest, b: MusicRequest): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function byPlaylistOrder(a: MusicRequest, b: MusicRequest): number {
  return (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0);
}

export function playlistOf(all: MusicRequest[]): MusicRequest[] {
  return all.filter((request) => request.status === "queued").sort(byPlaylistOrder);
}

export function inboxOf(all: MusicRequest[]): MusicRequest[] {
  return all.filter((request) => request.status === "pending").sort(byCreatedAt);
}

// 손님 화면에서 보여 줄 대기 순서: 플레이리스트 순서대로, 그 뒤에 아직 담지 않은 접수 곡을 신청 순으로.
export function waitingQueueOf(all: MusicRequest[]): MusicRequest[] {
  return [...playlistOf(all), ...inboxOf(all)];
}

function lastPlaylistOrder(all: MusicRequest[]): number {
  return Math.max(0, ...playlistOf(all).map((request) => request.playlistOrder ?? 0));
}

function firstPlaylistOrder(all: MusicRequest[]): number {
  return Math.min(1, ...playlistOf(all).map((request) => request.playlistOrder ?? 1));
}

function readSettings(): { repeat: RepeatMode } {
  return readMockData(settingsFileName, () => ({ repeat: "off" as RepeatMode }));
}

export const mockMusicBoxRepository = {
  async list(): Promise<MusicRequest[]> {
    return requests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(input: MusicRequestInput): Promise<MusicRequest> {
    const request: MusicRequest = {
      ...input,
      id: randomUUID(),
      status: "pending",
      youtubeVideoId: null,
      playlistOrder: null,
      createdAt: new Date().toISOString(),
      playedAt: null,
    };
    writeMockData(fileName, [...requests(), request]);
    return request;
  },

  // 본인 신청곡만 지울 수 있다. 지금 재생 중인 곡은 DJ 부스가 끊기지 않도록 지우지 않는다.
  async removeByUser(id: string, userId: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id && request.userId === userId);
    if (!target || target.status === "playing") return false;
    writeMockData(fileName, all.filter((request) => request.id !== id));
    return true;
  },

  // 접수 곡에 영상 링크를 붙여 플레이리스트 맨 끝에 담는다.
  async addToPlaylist(id: string, youtubeVideoId: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "pending") return false;
    target.youtubeVideoId = youtubeVideoId;
    target.playlistOrder = lastPlaylistOrder(all) + 1;
    target.status = "queued";
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트에서 빼면 링크는 남긴 채 접수함으로 돌아간다.
  async removeFromPlaylist(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "queued") return false;
    target.status = "pending";
    target.playlistOrder = null;
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트에서 바로 위(up) 또는 아래(down) 곡과 자리를 바꾼다.
  async moveInPlaylist(id: string, direction: "up" | "down"): Promise<boolean> {
    const all = requests();
    const playlist = playlistOf(all);
    const index = playlist.findIndex((request) => request.id === id);
    const neighbor = playlist[direction === "up" ? index - 1 : index + 1];
    if (index < 0 || !neighbor) return false;
    const target = playlist[index];
    [target.playlistOrder, neighbor.playlistOrder] = [neighbor.playlistOrder, target.playlistOrder];
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트의 곡을 바로 튼다. 듣던 곡은 끊긴 것이므로 플레이리스트 맨 앞으로 돌려 둔다.
  async playNow(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "queued") return false;
    const current = all.find((request) => request.status === "playing");
    if (current) {
      current.status = "queued";
      current.playlistOrder = firstPlaylistOrder(all) - 1;
    }
    target.status = "playing";
    target.playlistOrder = null;
    writeMockData(fileName, all);
    return true;
  },

  // 재생 완료: 지금 곡을 끝내고 플레이리스트 첫 곡을 튼다. 전체 반복이면 끝난 곡을 플레이리스트 맨 끝에 다시 담는다.
  // 나중에 영상이 끝날 때 자동으로 넘기고 싶으면 이 함수를 부르면 된다.
  async advance(): Promise<MusicRequest | null> {
    const all = requests();
    const current = all.find((request) => request.status === "playing");
    if (current) {
      current.playedAt = new Date().toISOString();
      if (readSettings().repeat === "all" && current.youtubeVideoId) {
        current.status = "queued";
        current.playlistOrder = lastPlaylistOrder(all) + 1;
      } else {
        current.status = "played";
      }
    }
    const next = playlistOf(all)[0] ?? null;
    if (next) {
      next.status = "playing";
      next.playlistOrder = null;
    }
    writeMockData(fileName, all);
    return next;
  },

  // 선곡 취소: 지금 곡을 멈추고 플레이리스트 맨 앞으로 되돌린다. 영상이 없던 곡은 접수함으로 돌아간다.
  async cancelCurrent(): Promise<boolean> {
    const all = requests();
    const current = all.find((request) => request.status === "playing");
    if (!current) return false;
    if (current.youtubeVideoId) {
      current.status = "queued";
      current.playlistOrder = firstPlaylistOrder(all) - 1;
    } else {
      current.status = "pending";
    }
    writeMockData(fileName, all);
    return true;
  },

  // 접수 취소: 지우지 않고 cancelled로 남겨 신청자가 마이페이지에서 확인할 수 있게 한다.
  async cancelRequest(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "pending") return false;
    target.status = "cancelled";
    writeMockData(fileName, all);
    return true;
  },

  async getRepeatMode(): Promise<RepeatMode> {
    return readSettings().repeat;
  },

  async setRepeatMode(repeat: RepeatMode): Promise<void> {
    writeMockData(settingsFileName, { repeat });
  },
};
