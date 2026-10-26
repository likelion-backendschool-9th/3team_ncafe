import { isMenuSort, isMenuStatus, type MenuSort, type MenuStatus } from "./menu";

export type MenuSearchParams = Record<string, string | string[] | undefined>;
export type MenuListQuery = { q: string; categoryId: number | null; status: MenuStatus | ""; sort: MenuSort; page: number };

const MAX_PAGE = 100_000;

const single = (value: MenuSearchParams[string]) => (typeof value === "string" ? value : "");

export function parseMenuId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

// URL page는 1부터 센다. 잘못된 값은 기본값으로 돌린다.
export function parseMenuSearchParams(raw: MenuSearchParams): MenuListQuery {
  const status = single(raw.status);
  const sort = single(raw.sort);
  const page = Number(single(raw.page));

  return {
    q: single(raw.q).trim().slice(0, 100),
    categoryId: parseMenuId(single(raw.categoryId)),
    status: isMenuStatus(status) ? status : "",
    sort: isMenuSort(sort) ? sort : "newest",
    // 백엔드 page는 int라 지나치게 큰 값은 400이 되므로 첫 페이지로 돌린다.
    page: Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1,
  };
}

// 기본값은 URL에서 생략한다.
export function menuListQuery(query: MenuListQuery, page = query.page): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoryId !== null) params.set("categoryId", String(query.categoryId));
  if (query.status) params.set("status", query.status);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  return params.size ? `?${params}` : "";
}
