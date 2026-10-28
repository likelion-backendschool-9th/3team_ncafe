import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import { parseSongs } from "@/app/_lib/songs/api";
import type { SongResponse } from "@/app/_lib/songs/types";

export async function fetchSongs(): Promise<SongResponse[]> {
  return parseSongs(await apiFetch<unknown>("/api/v1/admin/songs"));
}
