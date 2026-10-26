// page.tsx에서 parseMenuSearchParams(await searchParams)로 쓴다. 이름은 공개 메뉴 API 쿼리와 맞춘다.
export const MENU_SORTS = ["newest", "name", "price-low", "price-high"] as const;
export type MenuSort = (typeof MENU_SORTS)[number];
export type MenuQuery = { q: string; categoryId: number | null; sort: MenuSort };
type Raw = Record<string, string | string[] | undefined>;

const single = (value: Raw[string]) => (typeof value === "string" ? value : "");
const isMenuSort = (value: string): value is MenuSort => (MENU_SORTS as readonly string[]).includes(value);

function parseCategoryId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function parseMenuSearchParams(raw: Raw): MenuQuery {
  const sort = single(raw.sort);
  return {
    q: single(raw.q).trim().slice(0, 100),
    categoryId: parseCategoryId(single(raw.categoryId)),
    sort: isMenuSort(sort) ? sort : "newest",
  };
}

// 기본값은 URL에서 생략한다.
export function menuListHref(query: MenuQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoryId !== null) params.set("categoryId", String(query.categoryId));
  if (query.sort !== "newest") params.set("sort", query.sort);
  return params.size ? `/menus?${params}` : "/menus";
}
