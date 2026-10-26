import type { CustomerOrderResponse, OrderTemperature } from "./_lib/types";

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

export function orderCode(order: CustomerOrderResponse): string {
  return `#${order.id}`;
}

export function orderSummary(order: CustomerOrderResponse): string {
  const first = order.items[0];
  return first ? `${first.menuName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}종` : ""}` : "품목 없음";
}

export function optionLabel(temperature: OrderTemperature): string {
  return temperature === "hot" ? "HOT" : temperature === "iced" ? "ICE" : "옵션 없음";
}
