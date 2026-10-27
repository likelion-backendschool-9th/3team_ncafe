// /cart가 넘긴 주문 대상 장바구니 줄 id. 예: ?cartItemIds=11,13
type Raw = Record<string, string | string[] | undefined>;

// 주문 API의 cartItemIds 상한과 같다.
const MAX_ORDER_ITEMS = 100;

export function parseCartItemIds(raw: Raw): Set<number> {
  if (typeof raw.cartItemIds !== "string" || raw.cartItemIds.length === 0) return new Set();

  const parts = raw.cartItemIds.split(",");
  if (parts.length > MAX_ORDER_ITEMS || parts.some((part) => !/^[1-9]\d*$/.test(part))) return new Set();

  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id)) || new Set(ids).size !== ids.length) return new Set();
  return new Set(ids);
}
