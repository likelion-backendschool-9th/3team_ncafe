import { isOrderStatus, MAX_API_INTEGER, type OrderGroup, type OrderSort, type OrderStatus } from "./types";

export type OrderQuery = {
  q: string; status: OrderStatus | ""; sort: OrderSort; view: "list" | "grid"; pages: Record<OrderGroup, number>;
};
export type RawOrderQuery = Record<string, string | string[] | undefined>;
export const feedbackCodes = ["NOT_FOUND", "STALE_STATUS", "INVALID_STATUS"] as const;
export type OrderFeedbackCode = (typeof feedbackCodes)[number];
export type OrderFlash = { updated: boolean; error: OrderFeedbackCode | null; focus: "completed" | "canceled" | null };
const single = (value: RawOrderQuery[string]) => typeof value === "string" ? value : "";
function page(value: RawOrderQuery[string]): number {
  const raw = single(value);
  const number = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(number) && number > 0 && number <= MAX_API_INTEGER + 1 ? number : 1;
}

export function parseOrderSearchParams(raw: RawOrderQuery): OrderQuery {
  const status = single(raw.status);
  return { q: single(raw.q).trim().slice(0, 100), status: isOrderStatus(status) ? status : "",
    sort: single(raw.sort) === "oldest" ? "oldest" : "newest", view: single(raw.view) === "grid" ? "grid" : "list",
    pages: { active: page(raw.activePage), completed: page(raw.completedPage), canceled: page(raw.canceledPage) } };
}

export function serializeOrderQuery(query: OrderQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.view !== "list") params.set("view", query.view);
  for (const group of ["active", "completed", "canceled"] as const) {
    if (query.pages[group] > 1) params.set(`${group}Page`, String(query.pages[group]));
  }
  return params.toString();
}
export function parseOrderReturnQuery(value: string): OrderQuery {
  const params = new URLSearchParams(value);
  const raw: RawOrderQuery = {};
  for (const key of ["q", "status", "sort", "view", "activePage", "completedPage", "canceledPage"]) {
    const values = params.getAll(key);
    if (values.length === 1) raw[key] = values[0];
  }
  return parseOrderSearchParams(raw);
}
export function orderListHref(query: OrderQuery): string {
  const params = serializeOrderQuery(query);
  return `/admin/orders${params ? `?${params}` : ""}`;
}
export function orderDetailHref(id: number, query: OrderQuery): string {
  const params = serializeOrderQuery(query);
  return `/admin/orders/${id}${params ? `?${params}` : ""}`;
}
export function parseOrderId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function parseOrderFlash(raw: RawOrderQuery): OrderFlash {
  const error = single(raw.error);
  const focus = single(raw.focus);
  return { updated: single(raw.updated) === "1",
    error: (feedbackCodes as readonly string[]).includes(error) ? error as OrderFeedbackCode : null,
    focus: focus === "completed" || focus === "canceled" ? focus : null };
}
