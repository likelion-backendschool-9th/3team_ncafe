import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type MusicRequestStatus = "pending" | "playing" | "played";

export type MusicRequest = {
  id: string;
  // 신청한 회원. 회원 전용 신청 이전에 쌓인 목 데이터에는 없을 수 있다.
  userId: string | null;
  requesterName: string;
  songTitle: string;
  artist: string;
  story: string;
  status: MusicRequestStatus;
  audioUrl: string | null;
  createdAt: string;
  playedAt: string | null;
};

export type MusicRequestInput = Pick<MusicRequest, "userId" | "requesterName" | "songTitle" | "artist" | "story">;

const fileName = "music-requests.json";
export const MUSIC_BOX_SAMPLE_AUDIO = "/audio-samples/music-box-sample.wav";

type SeedRequest = Pick<MusicRequest, "songTitle" | "artist" | "requesterName" | "story" | "status">;

// 화면 확인용 목 데이터. 첫 곡은 재생 중, 다음 4곡은 대기, 나머지는 재생 완료 상태로 시작한다.
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
  // 대기열은 먼저 신청한 순서이므로 목록 위쪽 곡일수록 먼저 신청한 것으로 둔다.
  return seedRequests.map((request, index) => {
    const minutesAgo = request.status === "played" ? 120 + index * 15 : 100 - index * 15;
    return {
      ...request,
      id: randomUUID(),
      userId: null,
      audioUrl: request.status === "playing" ? MUSIC_BOX_SAMPLE_AUDIO : null,
      createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
      playedAt: request.status === "played" ? new Date(now - (index - 4) * 12 * 60_000).toISOString() : null,
    };
  });
}

function requests(): MusicRequest[] {
  return readMockData<MusicRequest[]>(fileName, seed);
}

export const mockMusicBoxRepository = {
  async list(): Promise<MusicRequest[]> {
    return requests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listByUser(userId: string): Promise<MusicRequest[]> {
    return (await this.list()).filter((request) => request.userId === userId);
  },

  async create(input: MusicRequestInput): Promise<MusicRequest> {
    const request: MusicRequest = {
      ...input,
      id: randomUUID(),
      status: "pending",
      audioUrl: null,
      createdAt: new Date().toISOString(),
      playedAt: null,
    };
    writeMockData(fileName, [...requests(), request]);
    return request;
  },

  async start(id: string, audioUrl: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "pending") return false;

    const now = new Date().toISOString();
    for (const request of all) {
      if (request.status === "playing") {
        request.status = "played";
        request.playedAt = now;
      }
    }
    target.status = "playing";
    target.audioUrl = audioUrl;
    writeMockData(fileName, all);
    return true;
  },

  async finish(id: string): Promise<boolean> {
    const all = requests();
    const target = all.find((request) => request.id === id);
    if (!target || target.status !== "playing") return false;
    target.status = "played";
    target.playedAt = new Date().toISOString();
    writeMockData(fileName, all);
    return true;
  },
};
