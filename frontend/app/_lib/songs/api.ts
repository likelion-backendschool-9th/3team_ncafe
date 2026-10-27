import "server-only";
import { apiFetch } from "@/app/_lib/api/client";
import type { CurrentSong, MusicBoxSongs, NowPlaying, SongResponse, SongStatus } from "./types";

const statuses: readonly SongStatus[] = ["pending", "queued", "playing", "played", "cancelled"];

type Json = Record<string, unknown>;

function invalid(): never {
  throw new Error("신청곡 응답 형식이 올바르지 않습니다.");
}

function object(value: unknown): Json {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : invalid();
}

function text(value: unknown): string {
  return typeof value === "string" ? value : invalid();
}

function optionalText(value: unknown): string | null {
  return value === null ? null : text(value);
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : invalid();
}

function optionalInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

function parseSong(value: unknown): SongResponse {
  const song = object(value);
  const status = statuses.find((candidate) => candidate === song.status) ?? invalid();
  return {
    id: integer(song.id),
    requesterName: text(song.requesterName),
    songTitle: text(song.songTitle),
    artist: text(song.artist),
    story: text(song.story),
    status,
    youtubeVideoId: optionalText(song.youtubeVideoId),
    playlistOrder: optionalInteger(song.playlistOrder),
    createdAt: text(song.createdAt),
    playedAt: optionalText(song.playedAt),
    startedAt: optionalText(song.startedAt),
    durationSeconds: optionalInteger(song.durationSeconds),
  };
}

export function parseSongs(value: unknown): SongResponse[] {
  return Array.isArray(value) ? value.map(parseSong) : invalid();
}

function parseCurrent(value: unknown): CurrentSong | null {
  if (value === null) return null;
  const song = object(value);
  return {
    id: integer(song.id),
    requesterName: text(song.requesterName),
    songTitle: text(song.songTitle),
    artist: text(song.artist),
    story: text(song.story),
    youtubeVideoId: optionalText(song.youtubeVideoId),
    startedAt: text(song.startedAt),
    durationSeconds: optionalInteger(song.durationSeconds),
    endsAt: optionalText(song.endsAt),
  };
}

export async function fetchMusicBoxSongs(): Promise<MusicBoxSongs> {
  const body = object(await apiFetch<unknown>("/api/v1/musicbox/songs"));
  return { playlist: parseSongs(body.playlist), inbox: parseSongs(body.inbox), played: parseSongs(body.played) };
}

export async function fetchNowPlaying(): Promise<NowPlaying> {
  const body = object(await apiFetch<unknown>("/api/v1/songs/now"));
  return { current: parseCurrent(body.current), serverNow: text(body.serverNow), revision: integer(body.revision) };
}
