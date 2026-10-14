import { randomUUID } from 'node:crypto';
import { readMockData, writeMockData } from './store';

// 접수(pending) → 관리자가 링크를 붙여 플레이리스트에 담음(queued) → 재생 중(playing) → 재생 완료(played).
// 관리자가 접수를 취소하면 cancelled로 남겨 신청자가 마이페이지에서 볼 수 있게 한다.
export type MusicRequestStatus =
  | 'pending'
  | 'queued'
  | 'playing'
  | 'played'
  | 'cancelled';
export type RepeatMode = 'off' | 'one' | 'all';

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

export type MusicRequestInput = Pick<
  MusicRequest,
  'userId' | 'requesterName' | 'songTitle' | 'artist' | 'story'
>;

const fileName = 'music-requests.json';
const settingsFileName = 'music-box-settings.json';

type SeedRequest = Pick<
  MusicRequest,
  'songTitle' | 'artist' | 'requesterName' | 'story' | 'status'
>;

// 화면 확인용 목 데이터. 전부 영상 없이 접수(pending) 또는 재생 완료 상태로 시작한다.
// "현재 선곡"을 보려면 관리자 화면에서 접수곡에 YouTube 링크를 붙여 플레이리스트에 담고 재생해야 한다.
const seedRequests: SeedRequest[] = [
  {
    songTitle: '서른 즈음에',
    artist: '김광석',
    requesterName: '3조의 누군가',
    status: 'pending',
    story:
      '학창시절 매일 함께했던 첫사랑, 고백도 못 한 채 갑자기 한국으로 떠났습니다. 몸이 멀어지면 잊힐 줄 알았는데 참 오래 고생했네요. 끝내 연락이 닿지 않아 이제야 노래로 마음을 전합니다. 잘 지내나요?',
  },
  {
    songTitle: '가진다는 말은 좀 그렇지?',
    artist: '십센치',
    requesterName: '첫사랑이야기',
    status: 'pending',
    story:
      '유치원 시절, 첫사랑 옆에선 세상 모든 소리가 음악처럼 아름다웠습니다. 이 소릴 들려주겠다며 식판을 젓가락으로 깡깡 연주했죠. 하지만 그 애는 "아, 시끄러워!"라며 가버렸고 제 달콤했던 첫사랑도 끝이 났습니다.',
  },
  {
    songTitle: 'DEBUG!',
    artist: '심통봇',
    requesterName: '임재혁',
    status: 'pending',
    story:
      '부트캠프에서 취업을 준비하며 끝없는 에러와 미래에 대한 불안으로 매일 밤을 지새우는 우리들. 막막하지만 포기하지 않고 함께 성장 중입니다. 수많은 버그를 잡듯 우리 삶의 불안도 멋지게 디버깅되길 응원합니다!',
  },
  {
    songTitle: '헤비 세레나데',
    artist: 'NMIXX',
    requesterName: '임채원',
    status: 'pending',
    story: '해원양이 저한테 프로포즈할때 불러준 노래에염',
  },
  {
    songTitle: '이등병의 편지',
    artist: '김광석',
    requesterName: '강태윤',
    status: 'pending',
    story:
      '훈련소 시절, 매일 밤 전우조 눈치를 보며 화장실 불빛 아래서 그녀에게 편지를 썼습니다. 편지봉투에 붙일 우표가 모자라 침을 묻혀 꼭꼭 누르던 기억이 나네요. 지금은 누군가의 아내가 되었을 그녀, 늘 행복하길.',
  },
  {
    songTitle: '주저하는 연인들을 위해',
    artist: '잔나비',
    requesterName: '한소희',
    status: 'pending',
    story:
      '고등학교 시절, 좋아하는 애한테 떡볶이를 사주려고 일주일 동안 차비를 아껴서 매일 한 시간씩 걸어 다녔습니다. 정작 떡볶이 앞에서는 부끄러워서 단무지만 씹다 왔네요. 그 시절의 서툴던 제가 참 그립습니다.',
  },
];

function seed(): MusicRequest[] {
  const now = Date.now();
  // 접수함은 먼저 신청한 순서이므로 목록 위쪽 곡일수록 먼저 신청한 것으로 둔다.
  return seedRequests.map((request, index) => {
    const minutesAgo =
      request.status === 'played' ? 120 + index * 15 : 100 - index * 15;
    return {
      ...request,
      id: randomUUID(),
      userId: null,
      youtubeVideoId: null,
      playlistOrder: null,
      createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
      playedAt:
        request.status === 'played'
          ? new Date(now - (index - 4) * 12 * 60_000).toISOString()
          : null,
    };
  });
}

// 예전 목 데이터(audioUrl로 저장하던 것, 플레이리스트가 없던 것)도 그대로 읽도록 빠진 값을 채운다.
type StoredMusicRequest = Omit<
  MusicRequest,
  'youtubeVideoId' | 'playlistOrder'
> & {
  youtubeVideoId?: string | null;
  playlistOrder?: number | null;
  audioUrl?: unknown;
};

function requests(): MusicRequest[] {
  return readMockData<StoredMusicRequest[]>(fileName, seed).map(
    ({ audioUrl: _legacy, ...request }) => ({
      ...request,
      youtubeVideoId: request.youtubeVideoId ?? null,
      playlistOrder: request.playlistOrder ?? null,
    }),
  );
}

function byCreatedAt(a: MusicRequest, b: MusicRequest): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function byPlaylistOrder(a: MusicRequest, b: MusicRequest): number {
  return (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0);
}

export function playlistOf(all: MusicRequest[]): MusicRequest[] {
  return all
    .filter((request) => request.status === 'queued')
    .sort(byPlaylistOrder);
}

export function inboxOf(all: MusicRequest[]): MusicRequest[] {
  return all
    .filter((request) => request.status === 'pending')
    .sort(byCreatedAt);
}

// 손님 화면에서 보여 줄 대기 순서: 플레이리스트 순서대로, 그 뒤에 아직 담지 않은 접수 곡을 신청 순으로.
export function waitingQueueOf(all: MusicRequest[]): MusicRequest[] {
  return [...playlistOf(all), ...inboxOf(all)];
}

function lastPlaylistOrder(all: MusicRequest[]): number {
  return Math.max(
    0,
    ...playlistOf(all).map((request) => request.playlistOrder ?? 0),
  );
}

function firstPlaylistOrder(all: MusicRequest[]): number {
  return Math.min(
    1,
    ...playlistOf(all).map((request) => request.playlistOrder ?? 1),
  );
}

function readSettings(): { repeat: RepeatMode } {
  return readMockData(settingsFileName, () => ({
    repeat: 'off' as RepeatMode,
  }));
}

export const mockMusicBoxRepository = {
  async list(): Promise<MusicRequest[]> {
    return requests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(input: MusicRequestInput): Promise<MusicRequest> {
    const request: MusicRequest = {
      ...input,
      id: randomUUID(),
      status: 'pending',
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
    const target = all.find(
      (request) => request.id === id && request.userId === userId,
    );
    if (!target || target.status === 'playing') return false;
    writeMockData(
      fileName,
      all.filter((request) => request.id !== id),
    );
    return true;
  },

  // 접수 곡에 영상 링크를 붙여 플레이리스트 맨 끝에 담는다.
  async addToPlaylist(id: string, youtubeVideoId: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'pending') return false;
    target.youtubeVideoId = youtubeVideoId;
    target.playlistOrder = lastPlaylistOrder(all) + 1;
    target.status = 'queued';
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트에서 빼면 링크는 남긴 채 접수함으로 돌아간다.
  async removeFromPlaylist(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'queued') return false;
    target.status = 'pending';
    target.playlistOrder = null;
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트에서 바로 위(up) 또는 아래(down) 곡과 자리를 바꾼다.
  async moveInPlaylist(id: string, direction: 'up' | 'down'): Promise<boolean> {
    const all = requests();
    const playlist = playlistOf(all);
    const index = playlist.findIndex((request) => request.id === id);
    const neighbor = playlist[direction === 'up' ? index - 1 : index + 1];
    if (index < 0 || !neighbor) return false;
    const target = playlist[index];
    [target.playlistOrder, neighbor.playlistOrder] = [
      neighbor.playlistOrder,
      target.playlistOrder,
    ];
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트의 곡을 바로 튼다. 듣던 곡은 끊긴 것이므로 플레이리스트 맨 앞으로 돌려 둔다.
  async playNow(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'queued') return false;
    const current = all.find((request) => request.status === 'playing');
    if (current) {
      current.status = 'queued';
      current.playlistOrder = firstPlaylistOrder(all) - 1;
    }
    target.status = 'playing';
    target.playlistOrder = null;
    writeMockData(fileName, all);
    return true;
  },

  // 재생 완료: 지금 곡을 끝내고 플레이리스트 첫 곡을 튼다. 전체 반복이면 끝난 곡을 플레이리스트 맨 끝에 다시 담는다.
  // 나중에 영상이 끝날 때 자동으로 넘기고 싶으면 이 함수를 부르면 된다.
  async advance(): Promise<MusicRequest | null> {
    const all = requests();
    const current = all.find((request) => request.status === 'playing');
    if (current) {
      current.playedAt = new Date().toISOString();
      if (readSettings().repeat === 'all' && current.youtubeVideoId) {
        current.status = 'queued';
        current.playlistOrder = lastPlaylistOrder(all) + 1;
      } else {
        current.status = 'played';
      }
    }
    const next = playlistOf(all)[0] ?? null;
    if (next) {
      next.status = 'playing';
      next.playlistOrder = null;
    }
    writeMockData(fileName, all);
    return next;
  },

  // 선곡 취소: 지금 곡을 멈추고 플레이리스트 맨 앞으로 되돌린다. 영상이 없던 곡은 접수함으로 돌아간다.
  async cancelCurrent(): Promise<boolean> {
    const all = requests();
    const current = all.find((request) => request.status === 'playing');
    if (!current) return false;
    if (current.youtubeVideoId) {
      current.status = 'queued';
      current.playlistOrder = firstPlaylistOrder(all) - 1;
    } else {
      current.status = 'pending';
    }
    writeMockData(fileName, all);
    return true;
  },

  // 접수 취소: 지우지 않고 cancelled로 남겨 신청자가 마이페이지에서 확인할 수 있게 한다.
  async cancelRequest(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'pending') return false;
    target.status = 'cancelled';
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
