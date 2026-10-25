import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./e2e", workers: 1, fullyParallel: false, timeout: 90_000,
  expect: { timeout: 20_000 }, reporter: "line",
  outputDir: join(tmpdir(), "ncafe-auth-e2e-results"),
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:13000", trace: "retain-on-failure" },
});
