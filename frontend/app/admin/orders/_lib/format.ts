import type { AdminOrderItem, AdminOrderResponse } from "./types";

const currency = new Intl.NumberFormat("ko-KR");
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
export const won = (amount: number) => `${currency.format(amount)}원`;
export const orderDate = (value: string) => dateTime.format(new Date(value));
export const orderCode = (id: number) => `#${id}`;
export const temperatureLabel = (temperature: AdminOrderItem["temperature"]) =>
  temperature === "hot" ? "HOT" : temperature === "iced" ? "ICE" : "옵션 없음";
export function orderSummary(order: AdminOrderResponse): string {
  const first = order.items[0];
  return first ? `${first.menuName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}` : "품목 없음";
}
