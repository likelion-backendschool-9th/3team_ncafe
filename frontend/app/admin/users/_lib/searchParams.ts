export type UserSearchParams = Record<string, string | string[] | undefined>;
export type UserListQuery = { page: number };

const single = (value: UserSearchParams[string]) => (typeof value === "string" ? value : "");

// URL page는 1부터 센다. 기본값 1은 URL에서 생략한다.
export function parseUserSearchParams(raw: UserSearchParams): UserListQuery {
  const page = Number(single(raw.page));
  return { page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

export function userListQuery(page: number): string {
  return page > 1 ? `?page=${page}` : "";
}

export function parseUserId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
