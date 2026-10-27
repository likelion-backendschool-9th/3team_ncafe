import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminApi, createMenu, loginAsAdmin, signupCustomer } from "./fixtures/admin";

// 화면을 연 뒤 세션이 끝난 상태에서 Server Action을 보내면 로그인 화면으로 가야 한다.
// proxy가 Action POST에 HTTP redirect를 돌려주면 Next가 응답을 해석하지 못해 화면이 그대로 멈춘다(#94).

test("고객: 장바구니 수량 변경 중 세션이 끝나면 로그인으로 간다", async ({ page, browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await loginAsAdmin(admin, "/admin/categories");
  const category = await adminApi<{ id: number }>(admin, "POST", "/api/v1/admin/categories", { name: `세션-${randomUUID().slice(0, 6)}` });
  const menu = await createMenu(admin, category.id, { supportsHot: false, supportsIced: false });

  await signupCustomer(page);
  await adminApi(page, "POST", "/api/v1/cart/items", { menuId: menu.id, temperature: null, quantity: 1 });
  await page.goto("/cart");
  await expect(page.getByText(menu.name, { exact: true })).toBeVisible();

  await page.context().clearCookies();
  await page.getByRole("button", { name: `${menu.name} 수량 늘리기` }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcart$/);
});

test("관리자: 카테고리 추가 중 세션이 끝나면 로그인으로 간다", async ({ page }) => {
  await loginAsAdmin(page, "/admin/categories");
  await page.getByLabel("새 카테고리명").fill(`세션-${randomUUID().slice(0, 6)}`);

  await page.context().clearCookies();
  await page.getByRole("button", { name: "카테고리 추가" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fcategories$/);
});
