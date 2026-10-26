import "server-only";

import { apiFetch } from "@/app/_lib/api/client";
import type { SongResponse } from "./types";

export async function fetchSongs(): Promise<SongResponse[]> {
  return apiFetch<SongResponse[]>("/api/v1/admin/songs");
}
