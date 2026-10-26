import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminApi, createMenu, loginAsAdmin, signupCustomer } from "./fixtures/admin";

// 전용 DB를 여러 번 돌려도 이름이 겹치지 않게 실행마다 접미사를 붙인다.
const suffix = () => randomUUID().slice(0, 8);
const path = "/admin/menus";

type Category = { id: number; name: string };

const createCategory = (page: Page, name = `분류-${suffix()}`) => adminApi<Category>(page, "POST", "/api/v1/admin/categories", { name });

// 스트리밍 중에는 숨겨진 페이지 사본이 잠시 DOM에 함께 있으므로 보이는 요소만 고른다.
const rows = (page: Page) => page.locator("tbody tr:visible");
const row = (page: Page, name: string) => rows(page).filter({ has: page.getByRole("link", { name, exact: true }) });
const visible = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });
const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });

// 서버 검증을 확인하려고 브라우저 입력 검사(min·max·required)를 끈다.
const skipBrowserValidation = (page: Page) => page.locator("form:visible").last().evaluate((form) => { (form as HTMLFormElement).noValidate = true; });

async function fillMenuForm(page: Page, values: { slug?: string; name?: string; categoryId?: number; description?: string; price?: string; hot?: boolean; iced?: boolean; imageUrl?: string }) {
  if (values.slug !== undefined) await field(page, "slug").fill(values.slug);
  if (values.name !== undefined) await field(page, "메뉴명").fill(values.name);
  if (values.imageUrl !== undefined) await field(page, "이미지 주소").fill(values.imageUrl);
  if (values.categoryId !== undefined) await field(page, "카테고리").selectOption(String(values.categoryId));
  if (values.description !== undefined) await field(page, "설명").fill(values.description);
  if (values.price !== undefined) await field(page, "가격 (원)").fill(values.price);
  if (values.hot !== undefined) await field(page, "핫").setChecked(values.hot);
  if (values.iced !== undefined) await field(page, "아이스").setChecked(values.iced);
}

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page, path);
});

test("M1 목록은 백엔드 메뉴를 slug·카테고리·가격·상태와 함께 보여 준다", async ({ page }) => {
  const coffee = await createCategory(page);
  const menu = await createMenu(page, coffee.id, { name: `아메리카노-${suffix()}` });
  await page.goto(`${path}?q=${menu.slug}`);

  await expect(page).toHaveTitle("메뉴 관리 | 삼다방");
  const target = row(page, menu.name);
  await expect(target).toContainText(menu.slug);
  await expect(target).toContainText(coffee.name);
  await expect(target).toContainText("4,500원");
  await expect(target).toContainText("판매 중");
});

test("M2 검색어·카테고리·상태로 걸러 주소에 남긴다", async ({ page }) => {
  const tag = suffix();
  const coffee = await createCategory(page);
  const dessert = await createCategory(page);
  await createMenu(page, coffee.id, { name: `아메리카노-${tag}` });
  const latte = await createMenu(page, coffee.id, { name: `카페라떼-${tag}`, available: false });
  await createMenu(page, dessert.id, { name: `모나카라떼-${tag}` });
  await page.reload();

  await field(page, "메뉴명").fill(`라떼-${tag}`);
  await field(page, "카테고리").selectOption(String(coffee.id));
  await field(page, "상태").selectOption("unavailable");
  await page.getByRole("button", { name: "검색", exact: true }).filter({ visible: true }).click();

  // GET 폼이라 기본 정렬 sort=newest도 주소에 붙는다.
  await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(`라떼-${tag}`)}&categoryId=${coffee.id}&status=unavailable(&|$)`));
  await expect(rows(page)).toHaveCount(1);
  await expect(row(page, latte.name)).toContainText("판매 중지");
});

test("M3 메뉴명 칸으로 slug도 찾는다", async ({ page }) => {
  const category = await createCategory(page);
  const menu = await createMenu(page, category.id);
  await field(page, "메뉴명").fill(menu.slug);
  await page.getByRole("button", { name: "검색", exact: true }).filter({ visible: true }).click();

  await expect(row(page, menu.name)).toBeVisible();
});

test("M4 가격 높은순으로 정렬한다", async ({ page }) => {
  const category = await createCategory(page);
  for (const price of [3000, 5000, 4000]) await createMenu(page, category.id, { price });
  await page.goto(`${path}?categoryId=${category.id}`);
  await field(page, "정렬").selectOption("price-high");
  await page.getByRole("button", { name: "검색", exact: true }).filter({ visible: true }).click();

  await expect(page).toHaveURL(/sort=price-high/);
  await expect(rows(page).locator("td:nth-child(4)")).toHaveText(["5,000원", "4,000원", "3,000원"]);
});

test("M5 20개씩 나누고 다음 페이지에서도 검색어를 유지한다", async ({ page }) => {
  const tag = `페이지-${suffix()}`;
  const category = await createCategory(page);
  for (let index = 0; index < 25; index += 1) await createMenu(page, category.id, { name: `${tag}-${index}` });
  await page.goto(`${path}?q=${encodeURIComponent(tag)}`);

  await expect(rows(page)).toHaveCount(20);
  const pagination = page.getByRole("navigation", { name: "메뉴 목록 페이지 이동" }).filter({ visible: true });
  await expect(pagination).toContainText("1 / 2");
  await pagination.getByRole("link", { name: "다음 →" }).click();

  await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(tag)}&page=2$`));
  await expect(rows(page)).toHaveCount(5);
  await expect(pagination).toContainText("2 / 2");
});

test("M6 잘못된 쿼리는 기본값으로 보여 준다", async ({ page }) => {
  await page.goto(`${path}?categoryId=abc&status=x&sort=y&page=-1`);

  await expect(page.getByRole("heading", { name: "메뉴 목록", exact: true }).filter({ visible: true })).toBeVisible();
  await expect(field(page, "정렬")).toHaveValue("newest");
  await expect(field(page, "카테고리")).toHaveValue("");
});

test("M7 결과가 없으면 빈 상태와 전체 보기 링크를 보여 준다", async ({ page }) => {
  await page.goto(`${path}?q=없는메뉴-${suffix()}`);

  await expect(visible(page, "조건에 맞는 메뉴가 없습니다")).toBeVisible();
  await expect(page.getByRole("link", { name: "전체 메뉴 보기" }).filter({ visible: true })).toHaveAttribute("href", path);
});

test("M8 등록하면 목록으로 이동해 알림과 새 줄을 보여 준다", async ({ page }) => {
  const coffee = await createCategory(page);
  const name = `아메리카노-${suffix()}`;
  await page.goto(`${path}/new`);
  await expect(page).toHaveTitle("메뉴 등록 | 삼다방");
  await fillMenuForm(page, { slug: `americano-${suffix()}`, name, categoryId: coffee.id, description: "진한 커피", price: "4500", hot: true, iced: true });
  await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();

  await expect(page).toHaveURL(/\/admin\/menus\?created=\d+$/);
  await expect(visible(page, "메뉴가 등록되었습니다.")).toBeVisible();
  await expect(row(page, name)).toBeVisible();
});

test("M9 온도와 이미지를 비우면 온도 구분 없음·기본 이미지로 등록한다", async ({ page }) => {
  const dessert = await createCategory(page);
  const name = `모나카-${suffix()}`;
  await page.goto(`${path}/new`);
  await fillMenuForm(page, { slug: `monaka-${suffix()}`, name, categoryId: dessert.id, description: "바삭한 과자", price: "3000", hot: false, iced: false, imageUrl: "" });
  await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();
  await page.getByRole("link", { name: "상세 보기" }).filter({ visible: true }).click();

  await expect(visible(page, "온도 구분 없음")).toBeVisible();
  await expect(page.getByRole("img", { name: `${name} 이미지` }).filter({ visible: true })).toHaveAttribute("src", "/images/menus/placeholder.svg");
});

test("M10 slug 형식이 틀리면 입력란 오류를 보여 주고 입력값을 유지한다", async ({ page }) => {
  const category = await createCategory(page);
  await page.goto(`${path}/new`);
  await fillMenuForm(page, { slug: "Ameri Cano", name: "아메리카노", categoryId: category.id, description: "진한 커피", price: "4500" });
  await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();

  await expect(page.locator("#slug-error")).toHaveText("slug는 소문자·숫자·하이픈만 사용할 수 있습니다.");
  await expect(field(page, "slug")).toHaveValue("Ameri Cano");
  await expect(field(page, "메뉴명")).toHaveValue("아메리카노");
  await expect(field(page, "카테고리")).toHaveValue(String(category.id));
});

test("M11 가격이 범위를 벗어나면 입력란 오류를 보여 준다", async ({ page }) => {
  const category = await createCategory(page);
  await page.goto(`${path}/new`);
  for (const price of ["0", "1000001"]) {
    await fillMenuForm(page, { slug: `price-${suffix()}`, name: "가격 확인", categoryId: category.id, description: "가격", price });
    await skipBrowserValidation(page);
    await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();
    await expect(page.locator("#price-error")).toHaveText("가격은 1~1,000,000원으로 입력해 주세요.");
  }
});

test("M12 slug가 겹치면 백엔드 메시지를 slug 입력란에 보여 준다", async ({ page }) => {
  const category = await createCategory(page);
  const existing = await createMenu(page, category.id);
  await page.goto(`${path}/new`);
  await fillMenuForm(page, { slug: existing.slug, name: "중복", categoryId: category.id, description: "중복 slug", price: "4500" });
  await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();

  await expect(page.locator("#slug-error")).toHaveText("이미 사용 중인 slug입니다.");
});

test("M13 폼을 연 뒤 삭제된 카테고리는 카테고리 입력란 오류로 보여 준다", async ({ page }) => {
  const category = await createCategory(page);
  await page.goto(`${path}/new`);
  await fillMenuForm(page, { slug: `gone-${suffix()}`, name: "사라진 분류", categoryId: category.id, description: "분류 삭제", price: "4500" });
  await adminApi(page, "DELETE", `/api/v1/admin/categories/${category.id}`);
  await page.getByRole("button", { name: "메뉴 등록", exact: true }).filter({ visible: true }).click();

  await expect(page.locator("#categoryId-error")).toHaveText("존재하지 않는 카테고리입니다.");
});

test("M14 등록·수정 폼에는 파일 업로드와 영문명 입력이 없다", async ({ page }) => {
  const category = await createCategory(page);
  const menu = await createMenu(page, category.id);
  for (const url of [`${path}/new`, `${path}/${menu.id}/edit`]) {
    await page.goto(url);
    await expect(field(page, "이미지 주소")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByLabel(/영어/)).toHaveCount(0);
  }
});

test("M15 상세는 slug·카테고리·온도·가격·상태·날짜를 보여 준다", async ({ page }) => {
  const coffee = await createCategory(page);
  const menu = await createMenu(page, coffee.id, { supportsIced: true });
  await page.goto(`${path}/${menu.id}`);

  const card = page.locator("dl:visible");
  for (const text of [menu.slug, coffee.name, "핫, 아이스", "4,500원", "판매 중", "등록일", "최근 수정"]) {
    await expect(card).toContainText(text);
  }
});

test("M16·M17 수정하면 상세로 이동하고 slug는 바뀌지 않는다", async ({ page }) => {
  const coffee = await createCategory(page);
  const dessert = await createCategory(page);
  const menu = await createMenu(page, coffee.id);
  await page.goto(`${path}/${menu.id}/edit`);

  await expect(field(page, "slug")).toHaveAttribute("readonly", "");
  await expect(field(page, "slug")).toHaveValue(menu.slug);
  await fillMenuForm(page, { price: "5000", categoryId: dessert.id });
  await page.getByRole("button", { name: "변경 저장", exact: true }).filter({ visible: true }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/menus/${menu.id}\\?updated=1$`));
  await expect(visible(page, "메뉴를 수정했습니다.")).toBeVisible();
  const card = page.locator("dl:visible");
  await expect(card).toContainText("5,000원");
  await expect(card).toContainText(dessert.name);
  await expect(card).toContainText(menu.slug);
});

test("M18 없는·숫자가 아닌·삭제한 메뉴는 404 화면을 보여 준다", async ({ page }) => {
  const category = await createCategory(page);
  const archived = await createMenu(page, category.id);
  await adminApi(page, "DELETE", `/api/v1/admin/menus/${archived.id}`);

  for (const url of [`${path}/999999`, `${path}/abc`, `${path}/${archived.id}`, `${path}/${archived.id}/edit`]) {
    await page.goto(url);
    await expect(visible(page, "페이지를 찾을 수 없습니다")).toBeVisible();
  }
});

test("M19 목록에서 삭제하면 알림을 보여 주고 공개 메뉴에서도 사라진다", async ({ page }) => {
  const category = await createCategory(page);
  const menu = await createMenu(page, category.id);
  await page.goto(`/menus?q=${encodeURIComponent(menu.name)}`);
  await expect(visible(page, menu.name)).toBeVisible();

  await page.goto(`${path}?q=${menu.slug}`);
  page.once("dialog", (dialog) => dialog.accept());
  await row(page, menu.name).getByRole("button", { name: "삭제", exact: true }).click();

  await expect(page).toHaveURL(/\/admin\/menus\?deleted=1$/);
  await expect(visible(page, "메뉴를 삭제했습니다.")).toBeVisible();
  await expect(row(page, menu.name)).toHaveCount(0);
  await page.goto(`/menus?q=${encodeURIComponent(menu.name)}`);
  await expect(visible(page, menu.name)).toHaveCount(0);
});

test("M20 다른 창에서 먼저 삭제한 메뉴는 이미 삭제됨 알림을 보여 준다", async ({ page }) => {
  const category = await createCategory(page);
  const menu = await createMenu(page, category.id);
  await page.goto(`${path}?q=${menu.slug}`);
  await adminApi(page, "DELETE", `/api/v1/admin/menus/${menu.id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await row(page, menu.name).getByRole("button", { name: "삭제", exact: true }).click();

  await expect(page).toHaveURL(/\/admin\/menus\?missing=1$/);
  await expect(visible(page, "이미 삭제되었거나 존재하지 않는 메뉴입니다.")).toBeVisible();
});

test("M22 고객은 메뉴 관리에 들어갈 수 없다", async ({ browser }) => {
  const page = await browser.newPage();
  await signupCustomer(page);
  for (const url of [path, `${path}/new`]) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/forbidden$/);
  }
  await page.close();
});

test("M23 관리자 화면에서 바꾼 이름이 공개 메뉴에 보인다", async ({ page }) => {
  const category = await createCategory(page);
  const menu = await createMenu(page, category.id);
  const renamed = `새이름-${suffix()}`;
  await page.goto(`${path}/${menu.id}/edit`);
  await fillMenuForm(page, { name: renamed });
  await page.getByRole("button", { name: "변경 저장", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\?updated=1$/);

  await page.goto(`/menus?q=${encodeURIComponent(renamed)}`);
  await expect(visible(page, renamed)).toBeVisible();
});
