import type { Order, OrderItem } from "@/app/_lib/orders/types";

export const won = new Intl.NumberFormat("ko-KR");
export const orderDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function orderCode(order: Order): string {
  return order.id.slice(0, 8).toUpperCase();
}

export function orderSummary(order: Order): string {
  const first = order.items[0];
  return first ? `${first.menuName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}종` : ""}` : "품목 없음";
}

export function optionLabel(option: OrderItem["option"]): string {
  return option === "hot" ? "HOT" : option === "ice" ? "ICE" : "옵션 없음";
}
