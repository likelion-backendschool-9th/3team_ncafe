import { createHash } from "node:crypto";
import type { SongResponse } from "./types";

export type OnAir = {
  startedAt: string;
  durationSeconds: number | null;
  endsAt: number | null;
  serverNow: number;
};

const END_GRACE_MS = 1000;

function endsAt(song: SongResponse): number | null {
  if (!song.startedAt || !song.durationSeconds) return null;
  return Date.parse(song.startedAt) + song.durationSeconds * 1000 + END_GRACE_MS;
}

export function onAirOf(song: SongResponse | undefined): OnAir | null {
  if (!song || song.status !== "playing" || !song.startedAt) return null;
  return {
    startedAt: song.startedAt,
    durationSeconds: song.durationSeconds,
    endsAt: endsAt(song),
    serverNow: Date.now(),
  };
}

export function musicBoxVersion(all: SongResponse[]): string {
  const state = [...all]
    .sort((a, b) => a.id - b.id)
    .map((song) => [song.id, song.status, song.playlistOrder, song.youtubeVideoId, song.startedAt, song.durationSeconds]);
  return createHash("sha1").update(JSON.stringify(state)).digest("hex").slice(0, 16);
}

export function playlistOf(all: SongResponse[]): SongResponse[] {
  return all
    .filter((song) => song.status === "queued")
    .sort((a, b) => (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0));
}

export function inboxOf(all: SongResponse[]): SongResponse[] {
  return all
    .filter((song) => song.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
