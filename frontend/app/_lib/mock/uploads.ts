import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const allowedTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const maxBytes = 2 * 1024 * 1024; // 2MB

export class UploadError extends Error {}

export async function saveMenuImage(file: File): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new UploadError("로컬 이미지 업로드는 운영 환경에서 사용할 수 없습니다.");
  }
  const extension = allowedTypes[file.type];
  if (!extension) {
    throw new UploadError("PNG, JPEG, WEBP, SVG 이미지만 업로드할 수 있습니다.");
  }
  if (file.size > maxBytes) {
    throw new UploadError("이미지 용량은 2MB 이하여야 합니다.");
  }

  const directory = join(process.cwd(), "public", "uploads", "menus");
  await mkdir(directory, { recursive: true });

  const fileName = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(directory, fileName), buffer, { mode: 0o600 });

  return `/uploads/menus/${fileName}`;
}
