export type SongResponse = {
  id: number;
  requesterName: string;
  songTitle: string;
  artist: string;
  story: string;
  status: "pending" | "queued" | "playing" | "played" | "cancelled";
  youtubeVideoId: string | null;
  playlistOrder: number | null;
  createdAt: string;
  playedAt: string | null;
  startedAt: string | null;
  durationSeconds: number | null;
};
