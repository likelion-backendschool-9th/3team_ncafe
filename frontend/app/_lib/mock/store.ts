import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function dataPath(fileName: string): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local mock storage is unavailable in production.");
  }
  if (!/^[a-z-]+\.json$/.test(fileName)) {
    throw new Error("Invalid mock storage file name.");
  }

  const directory = join(process.cwd(), ".data");
  mkdirSync(directory, { recursive: true });
  return join(directory, fileName);
}

export function readMockData<T>(fileName: string, seed: () => T): T {
  const path = dataPath(fileName);
  if (!existsSync(path)) {
    writeMockData(fileName, seed());
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function writeMockData<T>(fileName: string, data: T): void {
  const path = dataPath(fileName);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  renameSync(temporaryPath, path);
}
