import type { SongResponse } from "@/app/_lib/songs/types";

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
