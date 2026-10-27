import { test, expect } from "@playwright/test";
import { parseAdminOrder, parseAdminOrderPage, type AdminOrderPageResponse, type AdminOrderResponse, type OrderApiQuery } from "../app/admin/orders/_lib/types";
import { parseOrderId, parseOrderReturnQuery, parseOrderSearchParams, orderListHref, serializeOrderQuery } from "../app/admin/orders/_lib/searchParams";
import { loadOrderDashboard } from "../app/admin/orders/_lib/queries";

const order: AdminOrderResponse = {
  id: 123456789, customerId: 3, customerName: "손님", orderType: "dine-in", paymentMethod: "cash", request: null,
  status: "received", statusVersion: 2, totalAmount: 8000, allowedStatuses: ["preparing", "canceled"],
  items: [{ id: 99, menuId: 8, menuName: "당시 메뉴", imageUrl: "/images/menus/coffee.png", temperature: "iced",
    quantity: 2, unitPrice: 4000, lineTotal: 8000 }],
  createdAt: "2026-10-26T00:00:00.123456Z", updatedAt: "2026-10-26T00:01:00Z",
};
const page = (request: OrderApiQuery, total: number): AdminOrderPageResponse => ({
  items: total && request.page * request.size < total ? [order] : [], page: request.page, size: request.size,
  totalElements: total, totalPages: Math.ceil(total / request.size),
});

test("order response preserves numeric identity, snapshots, iced and a nullable request", () => {
  expect(parseAdminOrder(order)).toEqual(order);
  for (const patch of [{ id: "123" }, { status: "unknown" }, { statusVersion: -1 }, { request: undefined },
    { createdAt: "invalid" }, { allowedStatuses: ["canceled", "canceled"] },
    { totalAmount: 1 }, { items: [{ ...order.items[0], temperature: "ice" }] },
    { items: [{ ...order.items[0], lineTotal: 1 }] }]) {
    expect(() => parseAdminOrder({ ...order, ...patch })).toThrow("응답 형식");
  }
  expect(() => parseAdminOrderPage({ items: [], page: 0, size: 101, totalElements: 0, totalPages: 0 })).toThrow();
});

test("queries normalize duplicates and unsafe integers and discard arbitrary return URLs", () => {
  const query = parseOrderSearchParams({ q: "  차  ", status: "other", view: "grid", sort: "oldest",
    activePage: ["2", "3"], completedPage: "9007199254740992", canceledPage: "2" });
  expect(query.pages).toEqual({ active: 1, completed: 1, canceled: 2 });
  expect(query.status).toBe("");
  const returned = parseOrderReturnQuery(`${serializeOrderQuery(query)}&next=https://evil.test&error=STALE_STATUS`);
  expect(returned).toEqual(query);
  expect(orderListHref(returned)).toBe("/admin/orders?q=%EC%B0%A8&sort=oldest&view=grid&canceledPage=2");
  for (const id of ["0", "-1", "1e3", "9007199254740992", "abc"]) expect(parseOrderId(id)).toBeNull();
  expect(parseOrderId("123456789")).toBe(123456789);
});

test("unfiltered dashboard fetches three DB pages and reuses their global counts", async () => {
  const requests: OrderApiQuery[] = [];
  const result = await loadOrderDashboard(parseOrderSearchParams({}), async request => {
    requests.push(request);
    return page(request, { active: 25, completed: 4, canceled: 2 }[request.group]);
  });
  expect(requests).toHaveLength(3);
  expect(requests.every(request => request.page === 0 && request.size === 10)).toBe(true);
  expect(result.counts).toEqual({ active: 25, completed: 4, canceled: 2, total: 31 });
  expect(result.filteredCount).toBe(31);
});

test("a status/query filter has independent unfiltered summary and preserves hidden section pages", async () => {
  const requests: OrderApiQuery[] = [];
  const result = await loadOrderDashboard(parseOrderSearchParams({ q: "메뉴", status: "ready", canceledPage: "2" }), async request => {
    requests.push(request);
    return page(request, request.size === 10 ? 7 : { active: 15, completed: 4, canceled: 2 }[request.group]);
  });
  expect(result.sections.map(section => section.group)).toEqual(["active"]);
  expect(result.filteredCount).toBe(7);
  expect(result.counts.total).toBe(21);
  expect(requests.filter(request => request.size === 1).every(request => !request.q && !request.status)).toBe(true);
  expect(result.query.pages.canceled).toBe(2);
});

test("out-of-range pages refetch the last valid page once; empty sections normalize to page one", async () => {
  const requests: OrderApiQuery[] = [];
  const result = await loadOrderDashboard(parseOrderSearchParams({ activePage: "9", completedPage: "8" }), async request => {
    requests.push(request);
    return page(request, request.group === "active" ? 11 : 0);
  });
  expect(requests.filter(request => request.group === "active").map(request => request.page)).toEqual([8, 1]);
  expect(requests.filter(request => request.group === "completed")).toHaveLength(1);
  expect(result.query.pages).toEqual({ active: 2, completed: 1, canceled: 1 });
});

test("a failed summary is an error instead of a fabricated zero-order dashboard", async () => {
  await expect(loadOrderDashboard(parseOrderSearchParams({ q: "차" }), async request => {
    if (request.size === 1) throw new Error("backend unavailable");
    return page(request, 1);
  })).rejects.toThrow("backend unavailable");
});
