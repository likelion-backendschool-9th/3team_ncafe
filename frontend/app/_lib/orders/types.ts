import type { Temperature } from "../mock/menus";

// The cart sends menu identity, selection, quantity, and the total it displayed.
// Order creation checks the current menu prices before saving a snapshot.
export type CreateOrderItem = {
  menuId: string;
  option: Temperature | null;
  quantity: number;
};

export type CreateOrderInput = {
  items: CreateOrderItem[];
  expectedTotalAmount: number;
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
