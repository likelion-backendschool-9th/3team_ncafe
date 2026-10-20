import type { Temperature } from "../mock/menus";

// The cart sends menu identity, selection, quantity, and the total it displayed.
// Order creation checks the current menu prices before saving a snapshot.
export type CreateOrderItem = {
  menuId: string;
  option: Temperature | null;
  quantity: number;
};

export type OrderType = "dine-in" | "takeout";

// 실제 결제 연동은 없고, 손님이 카운터에서 어떤 수단으로 낼지만 받는다.
export type PaymentMethod = "card" | "cash";

export const MAX_ORDER_REQUEST_LENGTH = 100;
export const MAX_CANCEL_REASON_LENGTH = 200;

export type CreateOrderInput = {
  items: CreateOrderItem[];
  expectedTotalAmount: number;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  request: string;
};

export type OrderStatus = "received" | "preparing" | "ready" | "completed" | "canceled";

export type OrderItem = CreateOrderItem & {
  menuName: string;
  imageUrl: string;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  // 주문서 화면 이전에 저장된 주문에는 아래 세 값이 없다.
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  request?: string;
  // 관리자가 주문을 취소할 때 남긴 사유. 고객이 직접 취소한 주문에는 없다.
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  received: "접수",
  preparing: "준비 중",
  ready: "준비 완료",
  completed: "완료",
  canceled: "취소",
};

export const orderTypeLabels: Record<OrderType, string> = {
  "dine-in": "매장 식사",
  takeout: "포장",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
};
