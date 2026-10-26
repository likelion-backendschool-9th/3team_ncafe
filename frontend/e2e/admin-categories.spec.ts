import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminApi, loginAsAdmin, signupCustomer } from "./fixtures/admin";

// 전용 DB를 여러 번 돌려도 이름이 겹치지 않게 실행마다 접미사를 붙인다.
const unique = (name: string) => `${name}-${randomUUID().slice(0, 8)}`;
const path = "/admin/categories";

type Category = { id: number; name: string };

const createCategory = (page: Page, name: string) => adminApi<Category>(page, "POST", "/api/v1/admin/categories", { name });

async function createMenus(page: Page, categoryId: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    await adminApi(page, "POST", "/api/v1/admin/menus", {
      categoryId, slug: `e2e-${randomUUID()}`, name: unique("메뉴"), description: "e2e 메뉴", imageUrl: "/images/menus/placeholder.svg",
      price: 4500, available: true, isNew: false, recommended: false, supportsHot: true, supportsIced: false,
    });
  }
}

// 스트리밍 중에는 숨겨진 페이지 사본이 잠시 DOM에 함께 있으므로 보이는 행만 고른다.
// 기타 행은 draggable="false"라서 값과 관계없이 draggable 속성으로 찾는다.
const rows = (page: Page) => page.locator("div[draggable]:visible");
const rowNames = (page: Page) => rows(page).locator('input[name="name"]').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
const row = (page: Page, name: string) =>
  rows(page).filter({ has: page.getByLabel(`${name} 카테고리명`, { exact: true }) });

// 화면의 카테고리 순서 중 이 테스트가 만든 이름만 남긴다.
async function orderOf(page: Page, names: string[]) {
  return (await rowNames(page)).filter((value) => names.includes(value));
}

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page, path);
});

test("C1 목록은 백엔드 순서와 메뉴 수를 보여 준다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  await createMenus(page, coffee.id, 2);
  await page.reload();

  await expect(page).toHaveTitle("카테고리 관리 | 삼다방");
  await expect(row(page, coffee.name)).toContainText("메뉴 2개에서 사용 중");
  const count = await rows(page).count();
  await expect(page.getByText(`${count}개`, { exact: true }).filter({ visible: true })).toBeVisible();
});

test("C2 기타 카테고리는 수정·삭제가 잠겨 있다", async ({ page }) => {
  const fallback = row(page, "기타");
  for (const name of ["수정", "삭제"]) {
    const button = fallback.getByRole("button", { name, exact: true });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("title", "삭제된 카테고리의 메뉴가 옮겨 가는 기타 카테고리라 수정·삭제할 수 없어요.");
  }
});

test("C3 고객은 카테고리 관리에 들어갈 수 없다", async ({ browser }) => {
  const page = await browser.newPage();
  await signupCustomer(page);
  await page.goto(path);
  await expect(page).toHaveURL(/\/forbidden$/);
  await page.close();
});

test("F4 추가하면 앞뒤 공백을 지우고 기타 바로 위에 저장한다", async ({ page }) => {
  const name = unique("차");
  const input = page.getByLabel("새 카테고리명", { exact: true });
  await input.fill(`  ${name}  `);
  await page.getByRole("button", { name: "카테고리 추가", exact: true }).click();

  await expect(row(page, name)).toBeVisible();
  await expect(input).toHaveValue("");
  await expect.poll(async () => (await rowNames(page)).slice(-2)).toEqual([name, "기타"]);
  await page.reload();
  await expect.poll(async () => (await rowNames(page)).slice(-2)).toEqual([name, "기타"]);
});

test("F1·F2 기타는 맨 아래에 고정되고 바로 위 행은 아래로 옮길 수 없다", async ({ page }) => {
  const tea = await createCategory(page, unique("녹차"));
  await page.reload();

  await expect.poll(async () => (await rowNames(page)).at(-1)).toBe("기타");
  const fallback = row(page, "기타");
  await expect(fallback).toHaveAttribute("draggable", "false");
  await expect(page.getByRole("button", { name: "기타 위로 이동", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "기타 아래로 이동", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: `${tea.name} 아래로 이동`, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: `${tea.name} 위로 이동`, exact: true })).toBeEnabled();
});

test("F3 기타 위로 끌어 놓아도 순서가 바뀌지 않는다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  const tea = await createCategory(page, unique("녹차"));
  await page.reload();
  const before = await rowNames(page);
  const actions: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && request.headers()["next-action"]) actions.push(request.url()); });

  await row(page, coffee.name).dragTo(row(page, "기타"));

  await expect.poll(() => rowNames(page)).toEqual(before);
  expect(actions).toEqual([]);
  await page.reload();
  expect(await orderOf(page, [coffee.name, tea.name, "기타"])).toEqual([coffee.name, tea.name, "기타"]);
});

test("F5 공개 메뉴의 카테고리 탭은 기타가 마지막이다", async ({ page }) => {
  await createCategory(page, unique("커피"));
  await page.goto("/menus");
  const tabs = page.getByRole("navigation", { name: "카테고리 필터" }).getByRole("link");
  await expect(tabs.last()).toHaveText("기타");
});

test("C6 중복 이름은 백엔드 메시지를 보여 주고 입력값을 유지한다", async ({ page }) => {
  const existing = await createCategory(page, unique("커피"));
  await page.reload();
  const input = page.getByLabel("새 카테고리명", { exact: true });
  await input.fill(existing.name);
  await page.getByRole("button", { name: "카테고리 추가", exact: true }).click();

  await expect(page.locator("#new-category-error")).toHaveText("이미 존재하는 카테고리입니다.");
  await expect(input).toHaveValue(existing.name);
  await expect(row(page, existing.name)).toHaveCount(1);
});

test("C7 공백만 입력하면 백엔드를 부르지 않고 입력란 오류를 보여 준다", async ({ page }) => {
  const input = page.getByLabel("새 카테고리명", { exact: true });
  await expect(input).toHaveAttribute("maxlength", "40");
  await input.fill("   ");
  await page.getByRole("button", { name: "카테고리 추가", exact: true }).click();

  await expect(page.locator("#new-category-error")).toHaveText("카테고리명은 1~40자로 입력해 주세요.");
  await expect(input).toHaveAttribute("aria-invalid", "true");
});

test("C8 이름을 수정하면 저장되고 읽기 상태로 돌아간다", async ({ page }) => {
  const category = await createCategory(page, unique("차"));
  const renamed = unique("녹차");
  await page.reload();
  const target = row(page, category.name);
  await target.getByRole("button", { name: "수정", exact: true }).click();
  await target.getByRole("textbox").fill(renamed);
  await target.getByRole("button", { name: "저장", exact: true }).click();

  await expect(row(page, renamed).getByRole("button", { name: "수정", exact: true })).toBeVisible();
  await page.reload();
  await expect(row(page, renamed)).toBeVisible();
  await expect(row(page, category.name)).toHaveCount(0);
});

test("C9 중복 이름으로 수정하면 메시지를 보여 주고 수정 상태를 유지한다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  const tea = await createCategory(page, unique("녹차"));
  await page.reload();
  const target = row(page, tea.name);
  await target.getByRole("button", { name: "수정", exact: true }).click();
  await target.getByRole("textbox").fill(coffee.name);
  await target.getByRole("button", { name: "저장", exact: true }).click();

  await expect(page.locator(`#category-${tea.id}-error`)).toHaveText("이미 존재하는 카테고리입니다.");
  await expect(page.locator(`#category-${tea.id}-error`).locator("..").getByRole("button", { name: "저장", exact: true })).toBeVisible();
});

test("C10 ▲를 누르면 순서가 바뀌고 저장된다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  const tea = await createCategory(page, unique("녹차"));
  const names = [coffee.name, tea.name];
  await page.reload();
  await page.getByRole("button", { name: `${tea.name} 위로 이동`, exact: true }).click();

  await expect.poll(() => orderOf(page, names)).toEqual([tea.name, coffee.name]);
  await expect.poll(async () => { await page.reload(); return orderOf(page, names); }).toEqual([tea.name, coffee.name]);
});

test("C11 드래그로 순서를 바꾸면 저장된다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  const tea = await createCategory(page, unique("녹차"));
  const dessert = await createCategory(page, unique("다과"));
  const names = [coffee.name, tea.name, dessert.name];
  await page.reload();
  await row(page, dessert.name).dragTo(row(page, coffee.name));

  await expect.poll(() => orderOf(page, names)).toEqual([dessert.name, coffee.name, tea.name]);
  await expect.poll(async () => { await page.reload(); return orderOf(page, names); }).toEqual([dessert.name, coffee.name, tea.name]);
});

test("C12 다른 창에서 목록이 바뀌면 순서 변경을 거절하고 서버 목록으로 되돌린다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  const tea = await createCategory(page, unique("녹차"));
  await page.reload();
  const added = await createCategory(page, unique("디저트"));
  await page.getByRole("button", { name: `${coffee.name} 아래로 이동`, exact: true }).click();

  await expect(page.getByRole("alert").filter({ hasText: "카테고리 목록이 변경되었습니다." })).toHaveText("카테고리 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
  await expect(row(page, added.name)).toBeVisible();
  await expect.poll(() => orderOf(page, [coffee.name, tea.name])).toEqual([coffee.name, tea.name]);
});

test("C13 삭제하면 메뉴가 기타로 옮겨 가고 공개 메뉴 탭에서도 사라진다", async ({ page }) => {
  const coffee = await createCategory(page, unique("커피"));
  await createMenus(page, coffee.id, 2);
  await page.goto("/menus");
  await expect(page.getByRole("link", { name: coffee.name, exact: true })).toBeVisible();

  await page.goto(path);
  const fallbackUsage = row(page, "기타").getByText(/^메뉴 \d+개에서 사용 중$/);
  const before = Number((await fallbackUsage.textContent())?.match(/\d+/)?.[0]);
  await row(page, coffee.name).getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row(page, coffee.name)).toHaveCount(0);
  await expect(fallbackUsage).toHaveText(`메뉴 ${before + 2}개에서 사용 중`);
  await page.goto("/menus");
  await expect(page.getByRole("link", { name: coffee.name, exact: true })).toHaveCount(0);
});

test("C14 이미 삭제된 카테고리는 메시지를 보여 주고 닫으면 목록에서 사라진다", async ({ page }) => {
  const tea = await createCategory(page, unique("녹차"));
  await page.reload();
  await adminApi(page, "DELETE", `/api/v1/admin/categories/${tea.id}`);
  await row(page, tea.name).getByRole("button", { name: "삭제", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "삭제", exact: true }).click();

  await expect(dialog.getByRole("alert")).toHaveText("카테고리를 찾을 수 없습니다.");
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(row(page, tea.name)).toHaveCount(0);
});
