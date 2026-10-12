import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type MusicRequestStatus = "pending" | "playing" | "played";

export type MusicRequest = {
  id: string;
  requesterName: string;
  songTitle: string;
  artist: string;
  story: string;
  status: MusicRequestStatus;
  audioUrl: string | null;
  createdAt: string;
  playedAt: string | null;
};

export type MusicRequestInput = Pick<MusicRequest, "requesterName" | "songTitle" | "artist" | "story">;

const fileName = "music-requests.json";

function requests(): MusicRequest[] {
  return readMockData<MusicRequest[]>(fileName, () => []);
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
