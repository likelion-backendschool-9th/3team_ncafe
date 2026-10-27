import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { sqlText, testDatabase } from "./fixtures/postgres";

const password = "orders-browser123!";
type Fixture = { prefix: string; adminId: number; customerId: number; menuId: number;
  customerEmail: string; ids: number[]; receivedId: number; readyId: number };

async function csrf(api: APIRequestContext): Promise<Record<string, string>> {
  const response = await api.get("/api/v1/auth/csrf");
  expect(response.ok()).toBe(true);
  const value = await response.json();
  return { [value.headerName]: value.token };
}
async function login(api: APIRequestContext, email: string) {
  const response = await api.post("/api/v1/auth/login", { headers: await csrf(api), form: { email, password } });
  expect(response.ok()).toBe(true);
}
async function change(api: APIRequestContext, id: number, expectedStatus: string, statusVersion: number, nextStatus: string) {
  return api.put("/api/v1/admin/orders/status", { headers: await csrf(api), data: { id, expectedStatus, statusVersion, nextStatus } });
}
async function selectStatus(page: Page, id: number, status: string) {
  const select = page.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true });
  await select.selectOption(status);
  await select.locator("..").getByRole("button", { name: "변경", exact: true }).click();
}
async function fault(api: APIRequestContext, mode: string) {
  expect((await api.post("/api/v1/__e2e/orders-fault", { data: { mode } })).status()).toBe(204);
}
const test = base.extend<{ orders: Fixture }>({
  orders: async ({ context }, provide) => {
    const prefix = `e-${randomUUID().slice(0, 8)}`;
    const api = context.request;
    const signup = async (suffix: string) => {
      const email = `${prefix}-${suffix}@example.com`;
      const response = await api.post("/api/v1/auth/signup", {
        headers: await csrf(api), data: { name: `${prefix}-${suffix}`, email, password, passwordConfirm: password },
      });
      expect(response.status()).toBe(201);
      return { id: Number((await response.json()).id), email };
    };
    const admin = await signup("admin");
    const customer = await signup("customer");
    testDatabase(`update users set role='admin' where id=${admin.id} and email=${sqlText(admin.email)}`);
    await login(api, admin.email);
    const menuId = Number(testDatabase(`insert into menus(category_id,slug,name,description,image_url,price,available,is_new,recommended,supports_hot,supports_iced,created_at,updated_at)
      values((select id from categories where is_fallback=true),${sqlText(prefix)},${sqlText(prefix + '-현재 메뉴')},'테스트 메뉴','/images/menus/coffee.jpg',9000,true,false,true,true,true,now(),now()) returning id`));
    const ids = testDatabase(`insert into orders(customer_id,customer_name_snapshot,order_type,payment_method,request,status,total_amount,status_version,idempotency_key,request_fingerprint,created_at,updated_at)
      select ${customer.id},${sqlText(prefix + '-주문 고객')},'takeout','card',null,
        case when n<=5 then 'received' when n<=9 then 'preparing' when n<=13 then 'ready' when n<=25 then 'completed' else 'canceled' end,
        6000,0,${sqlText(prefix)} || '-' || n,repeat('a',64),'2026-10-01T00:00:00Z'::timestamptz + n * interval '1 minute',now()
      from generate_series(1,37) n returning id`).split("\n").map(Number);
    testDatabase(`insert into order_items(order_id,menu_id,menu_name,image_url,temperature,quantity,unit_price,line_total)
      select id,${menuId},${sqlText(prefix + '-당시 커피')},'/images/menus/coffee.jpg','iced',2,3000,6000 from orders where customer_id=${customer.id}`);
    try {
      await provide({ prefix, adminId: admin.id, customerId: customer.id, customerEmail: customer.email,
        menuId, ids, receivedId: ids[0], readyId: ids[12] });
    } finally {
      try {
        if ((await context.cookies()).some(cookie => cookie.name === "JSESSIONID")) await fault(api, "off");
      }
      finally {
        testDatabase(`begin; delete from order_items where order_id in (select id from orders where customer_id=${customer.id});
          delete from orders where customer_id=${customer.id}; delete from cart_items where user_id=${customer.id};
          delete from menus where id=${menuId};
          delete from users where id in (${admin.id},${customer.id}); commit;`);
      }
    }
  },
});

test("DB snapshots, global counts, search/status/sort, independent pagination and return URLs", async ({ page, orders }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/admin/orders?q=${orders.prefix}&sort=oldest&activePage=2&completedPage=2&canceledPage=2`);
  await expect(page.getByRole("heading", { name: "주문 목록", exact: true })).toBeVisible();
  const summary = page.getByRole("region", { name: "전체 주문 현황", exact: true });
  const totals = await summary.innerText();
  await expect(page.getByRole("navigation", { name: "처리 중 페이지 이동" })).toContainText("2 / 2");
  await page.getByRole("button", { name: /^완료 처리가 끝난 주문/ }).click();
  await page.getByRole("button", { name: /^취소 취소된 주문/ }).click();
  for (const group of ["완료", "취소"]) await expect(page.getByRole("navigation", { name: `${group} 페이지 이동` })).toContainText("2 / 2");
  await page.getByRole("navigation", { name: "처리 중 페이지 이동" }).getByRole("link", { name: "이전 페이지" }).click();
  await expect(page).toHaveURL(/completedPage=2&canceledPage=2/);
  await expect(page).not.toHaveURL(/activePage=/);
  await page.getByRole("navigation", { name: "처리 중 페이지 이동" }).getByRole("link", { name: "다음 페이지" }).click();
  await expect(page.getByRole("navigation", { name: "처리 중 페이지 이동" })).toContainText("2 / 2");
  await page.getByRole("link", { name: "그리드", exact: true }).click();
  await expect(page).toHaveURL(/view=grid.*activePage=2.*completedPage=2.*canceledPage=2/);
  await page.getByRole("article", { name: `주문 #${orders.readyId} 명세표`, exact: true }).getByRole("link", { name: "주문 상세보기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`#${orders.readyId}`);
  await expect(page.getByRole("main")).toContainText(`${orders.prefix}-당시 커피`);
  await expect(page.getByRole("main")).not.toContainText(`${orders.prefix}-현재 메뉴`);
  await expect(page.getByRole("main")).toContainText("ICE");
  await expect(page.getByRole("main")).toContainText("6,000");
  await expect(page.getByRole("main")).toContainText("카운터 결제수단");
  await expect(page.getByRole("img", { name: `${orders.prefix}-당시 커피 주문 당시 이미지`, exact: true })).toHaveAttribute("src", "/images/menus/coffee.jpg");
  await expect(page.getByRole("main")).not.toContainText("null");
  await page.reload();
  await page.getByRole("link", { name: "← 주문 목록으로", exact: true }).click();
  await expect(page).toHaveURL(/view=grid.*activePage=2.*completedPage=2.*canceledPage=2/);
  await page.getByRole("searchbox", { name: "주문 검색", exact: true }).fill(String(orders.receivedId));
  await page.getByRole("combobox", { name: "상태", exact: true }).selectOption("received");
  await page.getByRole("button", { name: "조회", exact: true }).click();
  await expect(page).not.toHaveURL(/(?:active|completed|canceled)Page=/);
  await expect.poll(() => summary.innerText()).toBe(totals);
  await expect(page.getByRole("article", { name: `주문 #${orders.receivedId} 명세표`, exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "주문 검색", exact: true }).fill("존재하지않는주문");
  await page.getByRole("button", { name: "조회", exact: true }).click();
  await expect(page.getByText("이 영역에 표시할 주문이 없습니다.", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.goto(`/admin/orders?q=${orders.prefix}&activePage=999&completedPage=999&canceledPage=999`);
  await expect(page.getByRole("navigation", { name: "처리 중 페이지 이동" })).toContainText("2 / 2");
  await page.getByRole("link", { name: "리스트", exact: true }).click();
  await expect(page).toHaveURL(/activePage=2.*completedPage=2.*canceledPage=2/);
  await page.screenshot({ path: info.outputPath("orders-desktop.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("adjacent updates, reverse updates and a second tab detect stale versions without replay", async ({ page, context, orders }) => {
  const id = orders.receivedId;
  await page.goto(`/admin/orders/${id}`);
  const second = await context.newPage();
  await second.goto(`/admin/orders/${id}`);
  await selectStatus(page, id, "preparing");
  await expect(page.getByRole("status")).toContainText("변경했습니다");
  await selectStatus(second, id, "preparing");
  await expect(second.getByRole("main").getByRole("alert")).toContainText("이미 변경됐습니다");
  await expect(second.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true })).toContainText("현재: 준비 중");
  const current = await (await context.request.get(`/api/v1/admin/orders/${id}`)).json();
  expect(current).toMatchObject({ status: "preparing", statusVersion: 1 });
  expect((await change(context.request, id, "preparing", 1, "completed")).status()).toBe(409);
  expect((await change(context.request, id, "preparing", 1, "canceled")).status()).toBe(409);
  await selectStatus(second, id, "received");
  await expect(second.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true })).toContainText("현재: 접수");
  expect(await (await context.request.get(`/api/v1/admin/orders/${id}`)).json()).toMatchObject({ status: "received", statusVersion: 2 });
});

test("cancel confirmation has no reason, traps focus, supports Escape and cannot be reversed", async ({ page, context, orders }) => {
  const id = orders.receivedId;
  await page.goto(`/admin/orders/${id}`);
  const cancel = page.getByRole("button", { name: "주문 취소", exact: true });
  await cancel.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "닫기", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "주문 취소 확인", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "닫기", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(cancel).toBeFocused();
  await cancel.click();
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(cancel).toBeFocused();
  await cancel.click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("변경했습니다");
  await expect(page.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true })).toHaveCount(0);
  expect(await (await context.request.get(`/api/v1/admin/orders/${id}`)).json()).toMatchObject({ status: "canceled", statusVersion: 1, allowedStatuses: [] });
});

test("last active page normalizes after completion and completed section opens", async ({ page, orders }) => {
  // Eleven active orders: completing the lone row on page two must show valid page one.
  testDatabase(`update orders set status='completed' where customer_id=${orders.customerId} and id in (${orders.ids[0]},${orders.ids[1]})`);
  await page.goto(`/admin/orders?q=${orders.prefix}&sort=oldest&activePage=2`);
  await selectStatus(page, orders.readyId, "completed");
  await expect(page).toHaveURL(/updated=1&focus=completed/);
  await expect(page.getByRole("navigation", { name: "처리 중 페이지 이동" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "처리 중 주문 목록 표" }).getByRole("row")).toHaveCount(11);
  await expect(page.getByRole("button", { name: /^완료 처리가 끝난 주문/ })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: `#${orders.readyId}`, exact: true })).toBeVisible();
});

test("403/401, invalid IDs, missing/invalid CSRF and session expiration preserve data", async ({ page, context, orders }) => {
  const id = orders.receivedId;
  expect((await context.request.put("/api/v1/admin/orders/status", { data: { id, expectedStatus: "received", statusVersion: 0, nextStatus: "preparing" } })).status()).toBe(403);
  expect((await context.request.put("/api/v1/admin/orders/status", { headers: { "X-CSRF-TOKEN": "invalid" }, data: { id, expectedStatus: "received", statusVersion: 0, nextStatus: "preparing" } })).status()).toBe(403);
  for (const value of ["0", "wrong", "9007199254740992", "999999999"]) {
    await page.goto(`/admin/orders/${value}`);
    await expect(page.getByRole("main")).toContainText("찾을 수 없");
  }
  await page.goto(`/admin/orders/${id}`);
  await context.clearCookies();
  await selectStatus(page, id, "preparing");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(testDatabase(`select status || ':' || status_version from orders where id=${id}`)).toBe("received:0");
  await login(context.request, orders.customerEmail);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/forbidden$/);
  expect((await context.request.get("/api/v1/admin/orders")).status()).toBe(403);
});

test("API failures and malformed responses show recoverable errors; mutations never retry", async ({ page, context, orders }) => {
  const id = orders.receivedId;
  await page.goto(`/admin/orders/${id}`);
  for (const mode of ["write-failed", "csrf-invalid"]) {
    await fault(context.request, mode);
    await selectStatus(page, id, "preparing");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(mode === "csrf-invalid" ? "세션을 확인하지 못했습니다" : "현재 주문 상태를 새로고침");
    expect(testDatabase(`select status_version from orders where id=${id}`)).toBe("0");
    await fault(context.request, "off");
  }
  for (const mode of ["unavailable", "malformed"]) {
    await fault(context.request, mode);
    await page.goto(`/admin/orders?q=${orders.prefix}`);
    await expect(page.getByRole("heading", { name: "주문 정보를 불러오지 못했습니다" })).toBeVisible();
    await fault(context.request, "off");
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByRole("heading", { name: "주문 목록", exact: true })).toBeVisible();
  }
});

test("role changes, suspension and deleted orders reject existing bound actions", async ({ page, context, orders }) => {
  const id = orders.receivedId;
  await page.goto(`/admin/orders/${id}`);
  await expect(page.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true })).toBeVisible();
  testDatabase(`update users set role='customer' where id=${orders.adminId}`);
  await selectStatus(page, id, "preparing");
  await expect(page).toHaveURL(/\/forbidden$/);
  expect(testDatabase(`select status_version from orders where id=${id}`)).toBe("0");
  testDatabase(`update users set role='admin' where id=${orders.adminId}`);
  await page.goto(`/admin/orders/${id}`);
  await expect(page.getByRole("combobox", { name: `주문 #${id} 상태 변경`, exact: true })).toBeVisible();
  testDatabase(`delete from order_items where order_id=${id}; delete from orders where id=${id}`);
  await selectStatus(page, id, "preparing");
  await expect(page).toHaveURL(/\/admin\/orders\?error=NOT_FOUND$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("주문을 찾을 수 없습니다");
  await page.goto(`/admin/orders/${orders.ids[1]}`);
  await expect(page.getByRole("combobox", { name: `주문 #${orders.ids[1]} 상태 변경`, exact: true })).toBeVisible();
  testDatabase(`update users set status='suspended' where id=${orders.adminId}`);
  await selectStatus(page, orders.ids[1], "preparing");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(testDatabase(`select status_version from orders where id=${orders.ids[1]}`)).toBe("0");
});

test("mobile/table/grid/dialog axe and existing member/menu API consumers remain functional", async ({ page, context, orders }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [`/admin/orders?q=${orders.prefix}`, `/admin/orders?q=${orders.prefix}&view=grid`, `/admin/orders/${orders.receivedId}`]) {
    await page.goto(route);
    expect((await new AxeBuilder({ page }).include("main").analyze()).violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
    // Next may retain identical metadata for cached search-parameter screens.
    await expect.poll(async () => {
      const values = await page.locator('head meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("content")));
      return values.length > 0 && values.every(value => value?.includes("noindex"));
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "주문 취소", exact: true }).click();
  expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
  await page.screenshot({ path: info.outputPath("orders-mobile-dialog.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.goto(`/admin/users?q=${orders.prefix}`);
  await expect(page.getByRole("link", { name: new RegExp(orders.prefix + "-customer") })).toBeVisible();
  await page.goto(`/admin/users/${orders.customerId}`);
  await page.getByRole("button", { name: new RegExp("회원 이용 정지$") }).click();
  await page.getByRole("button", { name: "이용 정지 확인", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("정지했습니다");
  await page.getByRole("button", { name: new RegExp("회원 정지 해제$") }).click();
  await page.getByRole("button", { name: "정지 해제 확인", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("해제했습니다");
  await login(context.request, orders.customerEmail);
  await page.goto("/my");
  await expect(page.getByRole("heading", { name: "나의 다방 수첩" })).toBeVisible();
  await page.goto(`/menus?q=${orders.prefix}`);
  await expect(page.getByRole("link", { name: new RegExp(`${orders.prefix}-현재 메뉴`) })).toBeVisible();
  await page.getByRole("navigation", { name: "카테고리 필터" }).getByRole("link", { name: "기타", exact: true }).click();
  await expect(page).toHaveURL(/categoryId=/);
  await expect(page.getByRole("link", { name: new RegExp(`${orders.prefix}-현재 메뉴`) })).toBeVisible();
  await page.goto(`/menus/${orders.prefix}`);
  await expect(page.getByRole("main")).toContainText(`${orders.prefix}-현재 메뉴`);
  await page.getByRole("button", { name: "장바구니에 담기", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const serverCart: { items: { menuId: number }[] } = await (await context.request.get("/api/v1/cart/items")).json();
  // Preserve the current C boundary and also support its incoming server-cart implementation.
  if (!serverCart.items.some(item => item.menuId === orders.menuId)) {
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ncafe_mock_cart"))).toContain(`"menuId":"${orders.menuId}"`);
  }
  expect((await context.request.get("/api/v1/menus")).ok()).toBe(true);
});
