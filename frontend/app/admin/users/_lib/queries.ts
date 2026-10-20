import type { User } from "@/app/_lib/mock/users";

export type UserSearchParams = Record<string, string | string[] | undefined>;
export const PAGE_SIZE = 10;
export const statusLabels = { active: "정상", suspended: "이용 정지" };
export const roleLabels = { customer: "회원", admin: "관리자" };

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function userFilters(params: UserSearchParams) {
  const page = Number(single(params.page));
  return {
    q: single(params.q).trim().slice(0, 100),
    status: ["active", "suspended"].includes(single(params.status)) ? single(params.status) : "",
    role: ["customer", "admin"].includes(single(params.role)) ? single(params.role) : "",
    sort: single(params.sort) === "email" ? "email" : "name",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function usersQuery(filters: ReturnType<typeof userFilters>, page = filters.page) {
  const query = new URLSearchParams();
  for (const key of ["q", "status", "role"] as const) {
    if (filters[key]) query.set(key, filters[key]);
  }
  if (filters.sort !== "name") query.set("sort", filters.sort);
  if (page > 1) query.set("page", String(page));
  return query.size ? `?${query}` : "";
}

export function visibleUsers(users: User[], filters: ReturnType<typeof userFilters>) {
  const needle = filters.q.toLocaleLowerCase("ko");
  return users.filter((user) =>
    (!needle || user.name.toLocaleLowerCase("ko").includes(needle) || user.email.toLowerCase().includes(needle)) &&
    (!filters.status || user.status === filters.status) && (!filters.role || user.role === filters.role),
  ).sort((a, b) => a[filters.sort === "email" ? "email" : "name"].localeCompare(b[filters.sort === "email" ? "email" : "name"], "ko") || a.id.localeCompare(b.id));
}
