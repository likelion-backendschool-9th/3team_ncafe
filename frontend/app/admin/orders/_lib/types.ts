export const ORDER_STATUSES = ["received", "preparing", "ready", "completed", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_GROUPS = ["active", "completed", "canceled"] as const;
export type OrderGroup = (typeof ORDER_GROUPS)[number];
export type OrderSort = "newest" | "oldest";

export type AdminOrderItem = {
  id: number; menuId: number; menuName: string; imageUrl: string;
  temperature: "hot" | "iced" | null; quantity: number; unitPrice: number; lineTotal: number;
};
export type AdminOrderResponse = {
  id: number; customerId: number; customerName: string; orderType: "dine-in" | "takeout";
  paymentMethod: "card" | "cash"; request: string | null; status: OrderStatus; statusVersion: number;
  totalAmount: number; items: AdminOrderItem[]; allowedStatuses: OrderStatus[]; createdAt: string; updatedAt: string;
};
export type AdminOrderPageResponse = {
  items: AdminOrderResponse[]; page: number; size: number; totalElements: number; totalPages: number;
};
export type OrderApiQuery = {
  group: OrderGroup; q?: string; status?: OrderStatus; sort?: OrderSort; page: number; size: number;
};
export type ChangeOrderStatusRequest = { id: number; expectedStatus: OrderStatus; statusVersion: number; nextStatus: OrderStatus };
export type OrderActionState = { error?: string; value?: OrderStatus };
export type OrderAction = (previous: OrderActionState, formData: FormData) => Promise<OrderActionState>;

export const statusLabels: Record<OrderStatus, string> = {
  received: "접수", preparing: "준비 중", ready: "준비 완료", completed: "완료", canceled: "취소",
};
export const groupLabels: Record<OrderGroup, string> = { active: "처리 중", completed: "완료", canceled: "취소" };
export const MAX_API_INTEGER = 2_147_483_647;
export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
export const isPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

function invalid(): never { throw new Error("관리자 주문 API 응답 형식이 올바르지 않습니다."); }
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid();
}
function text(value: unknown): string { return typeof value === "string" ? value : invalid(); }
function instant(value: unknown): string {
  const date = text(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(date)
    && Number.isFinite(Date.parse(date)) ? date : invalid();
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : invalid(); }

export function parseAdminOrder(value: unknown): AdminOrderResponse {
  const order = record(value);
  if (!isOrderStatus(order.status) || (order.orderType !== "dine-in" && order.orderType !== "takeout")
    || (order.paymentMethod !== "card" && order.paymentMethod !== "cash")) invalid();
  const items = array(order.items).map(value => {
    const item = record(value);
    if (item.temperature !== null && item.temperature !== "hot" && item.temperature !== "iced") invalid();
    const quantity = integer(item.quantity, 1);
    const unitPrice = integer(item.unitPrice);
    const lineTotal = integer(item.lineTotal);
    if (!Number.isSafeInteger(quantity * unitPrice) || lineTotal !== quantity * unitPrice) invalid();
    return { id: integer(item.id, 1), menuId: integer(item.menuId, 1), menuName: text(item.menuName),
      imageUrl: text(item.imageUrl), temperature: item.temperature as AdminOrderItem["temperature"], quantity, unitPrice, lineTotal };
  });
  const totalAmount = integer(order.totalAmount);
  if (!items.length || new Set(items.map(item => item.id)).size !== items.length
    || items.reduce((total, item) => total + item.lineTotal, 0) !== totalAmount) invalid();
  const allowedStatuses = array(order.allowedStatuses).map(status => isOrderStatus(status) ? status : invalid());
  if (new Set(allowedStatuses).size !== allowedStatuses.length) invalid();
  return {
    id: integer(order.id, 1), customerId: integer(order.customerId, 1), customerName: text(order.customerName),
    orderType: order.orderType as AdminOrderResponse["orderType"], paymentMethod: order.paymentMethod as AdminOrderResponse["paymentMethod"],
    request: order.request === null ? null : text(order.request), status: order.status as OrderStatus,
    statusVersion: integer(order.statusVersion, 0, MAX_API_INTEGER), totalAmount, items, allowedStatuses,
    createdAt: instant(order.createdAt), updatedAt: instant(order.updatedAt),
  };
}

export function parseAdminOrderPage(value: unknown): AdminOrderPageResponse {
  const page = record(value);
  const items = array(page.items).map(parseAdminOrder);
  const size = integer(page.size, 1, 100);
  const totalElements = integer(page.totalElements);
  if (items.length > size || totalElements < items.length) invalid();
  return { items, size, page: integer(page.page, 0, MAX_API_INTEGER), totalElements,
    totalPages: integer(page.totalPages, 0, MAX_API_INTEGER) };
}
