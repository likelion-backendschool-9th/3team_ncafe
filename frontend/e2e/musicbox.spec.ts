import { test, expect, type Browser, type Page } from "@playwright/test";
import { adminApi, loginAsAdmin, resetMusicBox, signupCustomer } from "./fixtures/admin";

// 고객 신청곡 화면(/musicbox, /my/songs, 홈 뮤직박스 칸)을 전용 DB의 백엔드 API로 확인한다.
// 시나리오 번호는 docs/musicbox/2026-10-27-frontend-customer-songs.md를 따른다.

type Song = { id: number; songTitle: string };

const videoId = "dQw4w9WgXcQ";
const visible = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });
const row = (page: Page, songTitle: string) => page.locator("tbody tr:visible").filter({ hasText: songTitle });

// 고객 세션으로 신청곡을 접수한다. 화면 흐름은 S7에서 따로 확인한다.
const requestSong = (page: Page, songTitle: string) =>
  adminApi<Song>(page, "POST", "/api/v1/musicbox/songs", { songTitle, artist: "가수", story: `${songTitle} 사연` });

async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginAsAdmin(page, "/admin/songs");
  return page;
}

const queue = (admin: Page, songId: number, durationSeconds: number) =>
  adminApi(admin, "POST", "/api/v1/admin/songs/playlist", { songId, youtubeVideoId: videoId, durationSeconds });

test.beforeEach(() => resetMusicBox());

test("S7·S8·S9 고객만 신청하고, 잘못된 입력은 필드 옆에 알린다", async ({ page, browser }) => {
  await page.goto("/musicbox");
  await expect(visible(page, "🔒 신청은 회원만 할 수 있어요")).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto("/musicbox");
  await expect(visible(admin, "🔒 신청은 고객 회원만 할 수 있어요")).toBeVisible();

  await signupCustomer(page);
  await page.goto("/musicbox");
  const title = page.getByLabel("곡 명");
  await title.evaluate((input) => input.removeAttribute("maxlength"));
  await title.fill("가".repeat(101));
  await page.getByLabel("가수이름").fill("아이유");
  await page.getByLabel("사 연").fill("첫 출근");
  await page.getByRole("button", { name: "➤ 신청하기" }).click();
  await expect(visible(page, "곡명은 1~100자로 입력해 주세요.")).toBeVisible();
  await expect(page.getByLabel("가수이름")).toHaveValue("아이유");
  await expect(title).toBeFocused();

  await title.fill(" 밤편지 ");
  await page.getByRole("button", { name: "➤ 신청하기" }).click();
  await expect(page).toHaveURL(/\/musicbox\?submitted=1$/);
  await expect(row(page, "밤편지")).toContainText("접수됨");
  await expect(row(page, "밤편지")).toContainText("브라우저 관리자");
});

test("S1·S4·S11·S12·S14 관리자 변경이 열린 화면에 반영되고, 내 신청곡을 지운다", async ({ page, browser }) => {
  await signupCustomer(page);
  const [first, second] = [await requestSong(page, "첫곡"), await requestSong(page, "둘째곡"), await requestSong(page, "셋째곡")];
  await page.goto("/musicbox");
  await expect(row(page, "첫곡")).toContainText("접수됨");

  // S4: 화면을 다시 불러오지 않아도 3초 폴링으로 바뀐다. 담은 곡은 재생 중인 곡이 없어 바로 재생된다.
  const admin = await adminPage(browser);
  await queue(admin, first.id, 600);
  await queue(admin, second.id, 600);
  await expect(row(page, "첫곡")).toContainText("재생 중");
  await expect(row(page, "둘째곡")).toContainText("재생 대기 1");
  await expect(page.getByRole("heading", { level: 3, name: "첫곡" })).toBeVisible();

  // S11: 재생 중 → 재생 대기 → 접수 순서이고, 재생 중인 곡에는 삭제 버튼이 없다.
  await page.goto("/my/songs");
  const badges = page.locator("ol li:visible span").filter({ hasText: /재생 중|재생 대기|접수됨/ });
  await expect(badges).toHaveText(["재생 중", "재생 대기 1", "접수됨"]);
  await expect(page.getByRole("button", { name: "첫곡 신청곡 삭제" })).toHaveCount(0);

  // S12
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "셋째곡 신청곡 삭제" }).click();
  await expect(page).toHaveURL(/\/my\/songs\?deleted=1$/);
  await expect(page.getByRole("button", { name: "셋째곡 신청곡 삭제" })).toHaveCount(0);
  await page.goto("/musicbox");
  await expect(row(page, "셋째곡")).toHaveCount(0);

  // S14
  await page.goto("/");
  await expect(visible(page, "플레이리스트에 담긴 신청곡 · 재생 대기 1곡")).toBeVisible();
});

test("S5 곡이 끝나면 화면이 스스로 다음 상태로 바뀐다", async ({ page, browser }) => {
  await signupCustomer(page);
  const song = await requestSong(page, "짧은곡");
  const admin = await adminPage(browser);
  await queue(admin, song.id, 3);

  await page.goto("/musicbox");
  await expect(visible(page, "아직 선곡된 노래가 없습니다. 첫 신청곡을 남겨 주세요.")).toBeVisible({ timeout: 15_000 });
  await expect(row(page, "짧은곡")).toContainText("재생 완료");
});
