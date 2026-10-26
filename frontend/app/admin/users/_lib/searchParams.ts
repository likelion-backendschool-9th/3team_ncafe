import { isUserRole, isUserStatus, type UserRole, type UserStatus } from "./user";

export const USER_SORTS = ["name", "email"] as const;
export type UserSort = (typeof USER_SORTS)[number];

export type UserSearchParams = Record<string, string | string[] | undefined>;
export type UserListQuery = { q: string; status: UserStatus | ""; role: UserRole | ""; sort: UserSort; page: number };

export const defaultUserListQuery: UserListQuery = { q: "", status: "", role: "", sort: "name", page: 1 };

const MAX_PAGE = 100_000;

const single = (value: UserSearchParams[string]) => (typeof value === "string" ? value : "");
const isUserSort = (value: string): value is UserSort => (USER_SORTS as readonly string[]).includes(value);

// URL page는 1부터 센다. 기본값은 URL에서 생략한다.
export function parseUserSearchParams(raw: UserSearchParams): UserListQuery {
  const status = single(raw.status);
  const role = single(raw.role);
  const sort = single(raw.sort);
  const page = Number(single(raw.page));

  return {
    q: single(raw.q).trim().slice(0, 100),
    status: isUserStatus(status) ? status : "",
    role: isUserRole(role) ? role : "",
    sort: isUserSort(sort) ? sort : "name",
    // 백엔드 page는 int라 지나치게 큰 값은 400이 되므로 첫 페이지로 돌린다.
    page: Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1,
  };
}

export function userListQuery(query: UserListQuery, page = query.page): string {
  const params = new URLSearchParams();
  for (const key of ["q", "status", "role"] as const) {
    if (query[key]) params.set(key, query[key]);
  }
  if (query.sort !== "name") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  return params.size ? `?${params}` : "";
}

export function parseUserId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
