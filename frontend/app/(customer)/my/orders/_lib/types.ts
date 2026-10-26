export type CustomerOrderStatus = "received" | "preparing" | "ready" | "completed" | "canceled";
export type CustomerOrderType = "dine-in" | "takeout";
export type CustomerPaymentMethod = "card" | "cash";
export type OrderTemperature = "hot" | "iced" | null;

export type CustomerOrderItemResponse = {
  menuId: number;
  menuName: string;
  imageUrl: string;
  temperature: OrderTemperature;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

// Mirrors my/OrdersController's OrderResponse DTO.
export type CustomerOrderResponse = {
  id: number;
  createdAt: string;
  status: CustomerOrderStatus;
  orderType: CustomerOrderType;
  paymentMethod: CustomerPaymentMethod;
  request: string | null;
  totalAmount: number;
  items: CustomerOrderItemResponse[];
};

export type CustomerOrderPageResponse = {
  items: CustomerOrderResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export const customerOrderStatusLabels: Record<CustomerOrderStatus, string> = {
  received: "접수",
  preparing: "준비 중",
  ready: "준비 완료",
  completed: "완료",
  canceled: "취소",
};

export const customerOrderTypeLabels: Record<CustomerOrderType, string> = {
  "dine-in": "매장 식사",
  takeout: "포장",
};

export const customerPaymentMethodLabels: Record<CustomerPaymentMethod, string> = {
  card: "카드",
  cash: "현금",
};
