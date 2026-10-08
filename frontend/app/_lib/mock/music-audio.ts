import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const allowedTypes: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};
const maxBytes = 25 * 1024 * 1024;

export class MusicAudioUploadError extends Error {}

export async function saveMusicAudio(file: File): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new MusicAudioUploadError("로컬 음원 업로드는 운영 환경에서 사용할 수 없습니다.");
  }
  const extension = allowedTypes[file.type];
  if (!extension) {
    throw new MusicAudioUploadError("MP3, M4A, OGG, WAV 음원만 업로드할 수 있습니다.");
  }
  if (file.size === 0 || file.size > maxBytes) {
    throw new MusicAudioUploadError("음원은 25MB 이하의 파일로 선택해 주세요.");
  }

  const directory = join(process.cwd(), "public", "audio");
  await mkdir(directory, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
  return `/audio/${fileName}`;
}
