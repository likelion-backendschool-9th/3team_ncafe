import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const password = "browser-password123!";
const email = () => `browser-${randomUUID()}@example.com`;

async function fillSignup(page: Page, address: string, secret = password, confirmation = secret) {
  await page.getByLabel("닉네임", { exact: true }).fill("브라우저 회원");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(secret);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(confirmation);
  await page.getByRole("button", { name: "단골로 등록하기", exact: true }).click();
}
async function signup(page: Page, address = email()) {
  await page.goto("/signup?next=%2Fmy");
  await fillSignup(page, address);
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole("heading", { name: "나의 다방 수첩" })).toBeVisible();
  return address;
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
}

test("signup auto-login, backend numeric identity, reload and logout share one HttpOnly session", async ({ page, context }) => {
  const address = await signup(page);
  const member = await (await context.request.get("/api/v1/my")).json();
  expect(member.email).toBe(address);
  expect(typeof member.id).toBe("number");
  await expect(page.getByText(`No. ${member.id}`, { exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find(cookie => cookie.name === "JSESSIONID");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect((await context.cookies()).some(cookie => cookie.name === "ncafe_mock_session")).toBe(false);
  expect(await page.evaluate(() => document.cookie)).not.toContain("JSESSIONID");
  await page.reload();
  await expect(page.getByText(address, { exact: true }).last()).toBeVisible();
  await logout(page);
  expect((await context.cookies()).some(cookie => cookie.name === "JSESSIONID")).toBe(false);
  expect((await context.request.get("/api/v1/my")).status()).toBe(401);
  await page.goto("/my");
  await expect(page).toHaveURL(/\/login\?next=%2Fmy/);
});

test("invalid login and duplicate signup retain public input and clear passwords", async ({ page }) => {
  const address = await signup(page);
  await logout(page);
  await page.goto("/login?next=%2Fmy");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password123!");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText("이메일 또는 비밀번호");
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(address);
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeFocused();
  await page.goto("/signup");
  await fillSignup(page, address);
  await expect(page.locator('main [role="alert"]')).toContainText("이미 가입");
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(address);
  await expect(page.getByLabel("닉네임", { exact: true })).toHaveValue("브라우저 회원");
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("비밀번호 확인", { exact: true })).toHaveValue("");
});

test("confirmation and UTF-8 password limits report field errors without losing identity fields", async ({ page }) => {
  await page.goto("/signup");
  const address = email();
  await fillSignup(page, address, password, "different-password");
  await expect(page.getByLabel("비밀번호 확인", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("비밀번호 확인", { exact: true })).toBeFocused();
  await fillSignup(page, address, "😀".repeat(19));
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeFocused();
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(address);
});

test("another tab and browser back refresh authentication after logout", async ({ page, context }) => {
  await signup(page);
  const second = await context.newPage();
  await second.goto("/my");
  await expect(second.getByRole("heading", { name: "나의 다방 수첩" })).toBeVisible();
  await page.bringToFront();
  await logout(page);
  await second.bringToFront();
  await expect(second).toHaveURL(/\/login\?next=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("external next is rejected and rewrites preserve CSRF protection", async ({ page, context }) => {
  await page.goto("/signup?next=%2F%2Fevil.example");
  await fillSignup(page, email());
  await expect(page).toHaveURL(/:\d+\/$/);
  const csrf = await (await context.request.get("/api/v1/auth/csrf")).json();
  const rejected = await context.request.post("/api/v1/auth/logout");
  expect(rejected.status()).toBe(403);
  expect((await context.request.get("/api/v1/my")).status()).toBe(200);
  expect((await context.request.post("/api/v1/auth/logout", { headers: { [csrf.headerName]: csrf.token } })).status()).toBe(204);
  expect((await context.request.get("/api/v1/my")).status()).toBe(401);
});

test("auth pages and member page have no serious axe violations and work with keyboard submission", async ({ page }, info) => {
  for (const route of ["/login", "/signup"]) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).include("main").analyze();
    expect(result.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
  await signup(page);
  const result = await new AxeBuilder({ page }).include("main").analyze();
  expect(result.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  await page.screenshot({ path: info.outputPath("member.png"), fullPage: true });
  await page.getByRole("button", { name: "로그아웃", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/:\d+\/$/);
});

test("successful signup with failed auto-login offers login instead of another signup", async ({ page }) => {
  const address = `fail-login-${randomUUID()}@example.com`;
  await page.goto("/signup?next=%2Fmy");
  await fillSignup(page, address);
  await expect(page).toHaveURL(/\/login\?registered=1&next=%2Fmy/);
  await expect(page.getByRole("status")).toContainText("회원가입이 완료");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/my$/);
});

test("administrator fixture uses real login and lands on admin while customer is forbidden", async ({ page }) => {
  const address = await signup(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/forbidden$/);
  await page.goto("/my");
  await logout(page);
  const container = process.env.E2E_PG_CONTAINER ?? "ncafe-auth-e2e-pg";
  const args = ["exec", container, "psql", "-U", "ncafe_test", "-d", "ncafe_auth_e2e", "-Atc"];
  // Mutate only the named, dedicated test database; public signup never accepts administrator privileges.
  expect(execFileSync("docker", [...args, "select current_database() || ':' || current_user"], { encoding: "utf8" }).trim())
    .toBe("ncafe_auth_e2e:ncafe_test");
  execFileSync("docker", [...args, `update users set role = 'admin' where email = '${address}'`]);
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect((await (await page.context().request.get("/api/v1/my")).json()).role).toBe("admin");
});
