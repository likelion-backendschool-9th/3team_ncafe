import type { OrderQuery } from "./searchParams";
import { ORDER_GROUPS, type AdminOrderPageResponse, type OrderApiQuery, type OrderGroup } from "./types";

export type OrderSectionResult = { group: OrderGroup; page: number; data: AdminOrderPageResponse };
export type OrderCounts = Record<OrderGroup, number> & { total: number };
type ReadOrders = (query: OrderApiQuery) => Promise<AdminOrderPageResponse>;
export const ORDER_PAGE_SIZE = 10;

// 조회 함수는 서버 page가 넘긴다. 그룹·페이지 계산은 쿠키나 요청 방식에 의존하지 않는다.
export async function loadOrderDashboard(query: OrderQuery, read: ReadOrders) {
  const groups = ORDER_GROUPS.filter(group => !query.status || group === (
    query.status === "completed" || query.status === "canceled" ? query.status : "active"));
  async function section(group: OrderGroup): Promise<OrderSectionResult> {
    const request: OrderApiQuery = { group, q: query.q, status: query.status || undefined,
      sort: query.sort, page: query.pages[group] - 1, size: ORDER_PAGE_SIZE };
    let data = await read(request);
    const page = Math.min(query.pages[group], Math.max(1, data.totalPages));
    if (data.totalElements > 0 && page !== query.pages[group]) data = await read({ ...request, page: page - 1 });
    return { group, page, data };
  }
  const filtered = Boolean(query.q || query.status);
  const [sections, unfiltered] = await Promise.all([
    Promise.all(groups.map(section)),
    filtered ? Promise.all(ORDER_GROUPS.map(async group => ({ group,
      count: (await read({ group, page: 0, size: 1 })).totalElements }))) : null,
  ]);
  const counts: OrderCounts = { active: 0, completed: 0, canceled: 0, total: 0 };
  if (unfiltered) unfiltered.forEach(({ group, count }) => { counts[group] = count; });
  else sections.forEach(({ group, data }) => { counts[group] = data.totalElements; });
  counts.total = counts.active + counts.completed + counts.canceled;
  const normalized: OrderQuery = { ...query, pages: { ...query.pages } };
  sections.forEach(({ group, page }) => { normalized.pages[group] = page; });
  return { query: normalized, sections, counts, filteredCount: sections.reduce((sum, section) => sum + section.data.totalElements, 0) };
}
