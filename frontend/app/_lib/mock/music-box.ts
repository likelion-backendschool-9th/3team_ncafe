import { randomUUID } from 'node:crypto';
import { readMockData, writeMockData } from './store';

// 접수(pending) → 관리자가 링크를 붙여 플레이리스트에 담음(queued) → 재생 중(playing) → 재생 완료(played).
// 재생 중인 곡이 없으면 플레이리스트 맨 앞 곡이 자동으로 재생 중이 된다.
// 재생 중인 곡은 시작 시각과 영상 길이로 서버가 끝을 정한다. 손님 화면이 열려 있지 않아도, 광고로 늦어져도 같은 시각에 다음 곡으로 넘어간다.
// 관리자가 접수를 취소하면 cancelled로 남겨 신청자가 마이페이지에서 볼 수 있게 한다.
export type MusicRequestStatus =
  | 'pending'
  | 'queued'
  | 'playing'
  | 'played'
  | 'cancelled';

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
  // 재생을 시작한 시각. 손님 화면은 이 시각으로 지금 몇 초째인지 맞춘다. 재생 중이 아니면 null.
  startedAt: string | null;
  // 영상 길이(초). 관리자 미리보기나 처음 재생한 화면이 알려 준다. 모르면 null이고, 그동안은 시간으로 넘기지 않는다.
  durationSeconds: number | null;
};

// 손님 화면에 넘기는 지금 곡의 재생 시각. serverNow는 화면을 그린 순간의 서버 시각으로, 손님 기기 시계가 틀려도 위치를 맞추게 한다.
export type OnAir = {
  startedAt: string;
  durationSeconds: number | null;
  endsAt: number | null;
  serverNow: number;
};

export type MusicRequestInput = Pick<
  MusicRequest,
  'userId' | 'requesterName' | 'songTitle' | 'artist' | 'story'
>;

const fileName = 'music-requests.json';

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
      startedAt: null,
      durationSeconds: null,
    };
  });
}

// 예전 목 데이터(audioUrl로 저장하던 것, 플레이리스트·재생 시각이 없던 것)도 그대로 읽도록 빠진 값을 채운다.
type StoredMusicRequest = Omit<
  MusicRequest,
  'youtubeVideoId' | 'playlistOrder' | 'startedAt' | 'durationSeconds'
> & {
  youtubeVideoId?: string | null;
  playlistOrder?: number | null;
  startedAt?: string | null;
  durationSeconds?: number | null;
  audioUrl?: unknown;
};

function requests(): MusicRequest[] {
  return readMockData<StoredMusicRequest[]>(fileName, seed).map(
    ({ audioUrl: _legacy, ...request }) => ({
      ...request,
      youtubeVideoId: request.youtubeVideoId ?? null,
      playlistOrder: request.playlistOrder ?? null,
      // 재생 시각을 저장하기 전부터 재생 중이던 곡은 시각 없이 두고, 예전처럼 영상이 끝날 때 넘긴다.
      startedAt: request.startedAt ?? null,
      durationSeconds: request.durationSeconds ?? null,
    }),
  );
}

// YouTube가 알려 주는 길이와 실제로 영상이 끝나는 때 사이의 오차를 감안해 조금 늦게 끝낸다.
const END_GRACE_MS = 1000;
// 손님 화면이 영상 끝을 알려도, 서버 시각으로 이보다 많이 남았으면 그 화면만 앞서간 것으로 보고 넘기지 않는다.
const EARLY_FINISH_TOLERANCE_MS = 5000;
// 비정상적인 길이 값은 받지 않는다. (6시간)
const MAX_DURATION_SECONDS = 6 * 60 * 60;

export function isValidDuration(seconds: unknown): seconds is number {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_DURATION_SECONDS;
}

function endsAt(request: MusicRequest): number | null {
  if (!request.startedAt || !request.durationSeconds) return null;
  return Date.parse(request.startedAt) + request.durationSeconds * 1000 + END_GRACE_MS;
}

export function onAirOf(request: MusicRequest | undefined): OnAir | null {
  if (!request || request.status !== 'playing' || !request.startedAt) return null;
  return {
    startedAt: request.startedAt,
    durationSeconds: request.durationSeconds,
    endsAt: endsAt(request),
    serverNow: Date.now(),
  };
}

function startPlaying(request: MusicRequest, at: number): void {
  request.status = 'playing';
  request.playlistOrder = null;
  request.startedAt = new Date(at).toISOString();
}

function finishPlaying(request: MusicRequest, at: number): void {
  request.status = 'played';
  request.playedAt = new Date(at).toISOString();
  request.startedAt = null;
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

// 재생 중인 곡이 없으면 플레이리스트 맨 앞 곡을 튼다. 상태를 바꾸는 작업은 저장 전에 항상 부른다.
function playNextIfIdle(all: MusicRequest[], at = Date.now()): MusicRequest | null {
  if (all.some((request) => request.status === 'playing')) return null;
  const next = playlistOf(all)[0] ?? null;
  if (next) startPlaying(next, at);
  return next;
}

// 재생 시간이 다 된 곡을 지난 선곡으로 넘기고 다음 곡을 튼다.
// 다음 곡은 앞 곡이 끝났어야 할 시각부터 재생된 것으로 쳐서, 조회가 늦게 와도 시간이 밀리지 않게 한다.
// 길이를 모르는 곡은 그 시각부터 세면 이미 끝났는지 알 수 없으므로 지금부터 시작한다.
// 아무도 화면을 보지 않는 동안 여러 곡이 지났으면 그만큼 한 번에 넘긴다.
function settle(all: MusicRequest[], now = Date.now()): boolean {
  let changed = false;
  for (;;) {
    const current = all.find((request) => request.status === 'playing');
    const end = current ? endsAt(current) : null;
    if (!current || end === null || end > now) return changed;
    finishPlaying(current, end);
    const next = playlistOf(all)[0];
    playNextIfIdle(all, next?.durationSeconds ? end : now);
    changed = true;
  }
}

// 상태를 바꾸는 작업은 시간이 지나 이미 넘어갔어야 할 곡부터 정리한 목록에서 시작한다.
function settledRequests(): MusicRequest[] {
  const all = requests();
  settle(all);
  return all;
}

export const mockMusicBoxRepository = {
  async list(): Promise<MusicRequest[]> {
    const all = requests();
    if (settle(all)) writeMockData(fileName, all);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      startedAt: null,
      durationSeconds: null,
    };
    writeMockData(fileName, [...settledRequests(), request]);
    return request;
  },

  // 본인 신청곡만 지울 수 있다. 지금 재생 중인 곡은 DJ 부스가 끊기지 않도록 지우지 않는다.
  async removeByUser(id: string, userId: string): Promise<boolean> {
    const all = settledRequests();
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

  // 접수 곡에 영상 링크를 붙여 플레이리스트 맨 끝에 담는다. 재생 중인 곡이 없으면 바로 재생된다.
  // 영상 길이는 관리자 미리보기가 읽은 값이다. 없으면 같은 영상에 전에 기록해 둔 길이를 그대로 쓴다.
  async addToPlaylist(id: string, youtubeVideoId: string, durationSeconds: number | null = null): Promise<boolean> {
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'pending') return false;
    const knownDuration = target.youtubeVideoId === youtubeVideoId ? target.durationSeconds : null;
    target.durationSeconds = durationSeconds ?? knownDuration;
    target.youtubeVideoId = youtubeVideoId;
    target.playlistOrder = lastPlaylistOrder(all) + 1;
    target.status = 'queued';
    playNextIfIdle(all);
    writeMockData(fileName, all);
    return true;
  },

  // 영상 길이를 아직 모르는 곡이면, 재생한 화면이 읽은 길이를 기록한다. 이미 있거나 영상이 바뀌었으면 그대로 둔다.
  async recordDuration(id: string, youtubeVideoId: string, durationSeconds: number): Promise<boolean> {
    if (!isValidDuration(durationSeconds)) return false;
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || target.youtubeVideoId !== youtubeVideoId || target.durationSeconds) return false;
    if (target.status !== 'playing' && target.status !== 'queued') return false;
    target.durationSeconds = durationSeconds;
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트나 지난 선곡의 곡을 링크는 남긴 채 접수함으로 되돌린다.
  async returnToInbox(id: string): Promise<boolean> {
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || (target.status !== 'queued' && target.status !== 'played')) return false;
    target.status = 'pending';
    target.playlistOrder = null;
    target.playedAt = null;
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트의 곡을 틀지 않고 지난 선곡으로 넘긴다.
  async moveToPlayed(id: string): Promise<boolean> {
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'queued') return false;
    target.status = 'played';
    target.playlistOrder = null;
    target.playedAt = new Date().toISOString();
    writeMockData(fileName, all);
    return true;
  },

  // 플레이리스트에서 바로 위(up) 또는 아래(down) 곡과 자리를 바꾼다.
  async moveInPlaylist(id: string, direction: 'up' | 'down'): Promise<boolean> {
    const all = settledRequests();
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

  // 플레이리스트의 곡을 바로 튼다. 듣던 곡은 끊긴 것이므로 플레이리스트 맨 앞으로 돌려 두고, 다시 틀 때는 처음부터 나온다.
  async playNow(id: string): Promise<boolean> {
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'queued') return false;
    const current = all.find((request) => request.status === 'playing');
    if (current) {
      current.status = 'queued';
      current.playlistOrder = firstPlaylistOrder(all) - 1;
      current.startedAt = null;
    }
    startPlaying(target, Date.now());
    writeMockData(fileName, all);
    return true;
  },

  // 재생 완료: 지금 곡을 지난 선곡으로 넘기고 플레이리스트 첫 곡을 튼다.
  // expectedId를 주면 그 곡이 아직 재생 중일 때만 넘긴다. 관리자 화면이 늦게 그려져 이미 넘어간 다음 곡을 끝내지 않게 한다.
  async advance(expectedId?: string): Promise<MusicRequest | null> {
    const all = settledRequests();
    const current = all.find((request) => request.status === 'playing');
    if (expectedId !== undefined && current?.id !== expectedId) return null;
    if (current) finishPlaying(current, Date.now());
    const next = playNextIfIdle(all);
    writeMockData(fileName, all);
    return next;
  },

  // 손님 화면에서 영상이 끝났다고 알려 올 때 쓴다. 서버 시각으로도 거의 끝난 곡일 때만 넘긴다.
  // 길이를 아는 곡은 시간이 되면 서버가 알아서 넘기므로, 여기서는 길이를 모르는 곡을 끝내는 역할이 크다.
  async finishIfDue(expectedId: string): Promise<boolean> {
    const all = settledRequests();
    const current = all.find((request) => request.status === 'playing');
    if (!current || current.id !== expectedId) return false;
    const end = endsAt(current);
    if (end !== null && end - Date.now() > EARLY_FINISH_TOLERANCE_MS) return false;
    finishPlaying(current, Date.now());
    playNextIfIdle(all);
    writeMockData(fileName, all);
    return true;
  },

  // 선곡 취소: 지금 곡을 링크는 남긴 채 접수함으로 되돌리고 플레이리스트 첫 곡을 튼다.
  // expectedId를 주면 그 곡이 아직 재생 중일 때만 취소한다.
  async cancelCurrent(expectedId?: string): Promise<boolean> {
    const all = settledRequests();
    const current = all.find((request) => request.status === 'playing');
    if (!current || (expectedId !== undefined && current.id !== expectedId)) return false;
    current.status = 'pending';
    current.playlistOrder = null;
    current.startedAt = null;
    playNextIfIdle(all);
    writeMockData(fileName, all);
    return true;
  },

  // 접수 취소: 지우지 않고 cancelled로 남겨 신청자가 마이페이지에서 확인할 수 있게 한다.
  async cancelRequest(id: string): Promise<boolean> {
    const all = settledRequests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== 'pending') return false;
    target.status = 'cancelled';
    writeMockData(fileName, all);
    return true;
  },
};
