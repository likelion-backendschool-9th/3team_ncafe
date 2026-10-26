// /cart가 넘긴 주문 대상 장바구니 줄 id. 예: ?cartItemIds=11,13
type Raw = Record<string, string | string[] | undefined>;

// 주문 API의 cartItemIds 상한과 같다.
const MAX_ORDER_ITEMS = 100;

export function parseCartItemIds(raw: Raw): Set<number> {
  const value = typeof raw.cartItemIds === "string" ? raw.cartItemIds : "";
  const ids = value.split(",")
    .filter((part) => /^[1-9]\d*$/.test(part))
    .map(Number)
    .filter(Number.isSafeInteger);
  return new Set(ids.slice(0, MAX_ORDER_ITEMS));
}
