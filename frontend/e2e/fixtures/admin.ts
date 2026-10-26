import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const password = "browser-password123!";
const container = process.env.E2E_PG_CONTAINER ?? "ncafe-auth-e2e-pg";
const psql = ["exec", container, "psql", "-U", "ncafe_test", "-d", "ncafe_auth_e2e", "-Atc"];

// 전용 테스트 DB에서만 실행한다. 다른 DB에 연결되어 있으면 아무것도 바꾸지 않고 실패한다.
function testSql(query: string) {
  expect(execFileSync("docker", [...psql, "select current_database() || ':' || current_user"], { encoding: "utf8" }).trim())
    .toBe("ncafe_auth_e2e:ncafe_test");
  execFileSync("docker", [...psql, query]);
}

export async function signupCustomer(page: Page) {
  const address = `browser-${randomUUID()}@example.com`;
  await page.goto("/signup?next=%2Fmy");
  await page.getByLabel("닉네임", { exact: true }).fill("브라우저 관리자");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "단골로 등록하기", exact: true }).click();
  await expect(page).toHaveURL(/\/my$/);
  return address;
}

// 공개 가입은 관리자 권한을 받지 않으므로, 가입한 계정의 역할을 전용 DB에서 바꾼 뒤 다시 로그인한다.
export async function loginAsAdmin(page: Page, next: string) {
  const address = await signupCustomer(page);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  testSql(`update users set role = 'admin' where email = '${address}'`);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}

// 뮤직박스 시나리오는 화면 순서와 개수를 확인하므로 전용 DB의 신청곡을 비우고 시작한다.
export function resetMusicBox() {
  testSql("delete from music_requests");
}

// 같은 세션의 CSRF 토큰을 붙여 백엔드 관리자 API를 직접 부른다. 다른 창의 변경이나 시나리오 준비에 쓴다.
export async function adminApi<T = unknown>(page: Page, method: "POST" | "PUT" | "DELETE", path: string, data?: unknown): Promise<T> {
  const request = page.context().request;
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  const response = await request.fetch(path, { method, data, headers: { [csrf.headerName]: csrf.token } });
  expect(response.ok(), `${method} ${path} → ${response.status()}`).toBe(true);
  return response.status() === 204 ? (undefined as T) : response.json();
}

export type TestMenu = { id: number; slug: string; name: string; price: number; categoryId: number };

// 시나리오 준비용 메뉴를 백엔드 API로 만든다. slug는 실행마다 겹치지 않는다.
export function createMenu(page: Page, categoryId: number, overrides: Record<string, unknown> = {}) {
  return adminApi<TestMenu>(page, "POST", "/api/v1/admin/menus", {
    categoryId, slug: `e2e-${randomUUID()}`, name: `메뉴-${randomUUID().slice(0, 8)}`, description: "e2e 메뉴", imageUrl: "/images/menus/placeholder.svg",
    price: 4500, available: true, isNew: false, recommended: false, supportsHot: true, supportsIced: false, ...overrides,
  });
}
