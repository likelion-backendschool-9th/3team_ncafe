import { randomUUID } from "node:crypto";
import { mockMenuRepository } from "./menus";
import { readMockData, writeMockData } from "./store";
import { MAX_ORDER_REQUEST_LENGTH, type CreateOrderInput, type Order, type OrderItem, type OrderStatus } from "../orders/types";

const fileName = "orders.json";
const maxItems = 50;
const maxQuantity = 99;
const orderTypes = ["dine-in", "takeout"];
const paymentMethods = ["card", "cash"];

const progress: OrderStatus[] = ["received", "preparing", "ready", "completed"];

export type OrderErrorCode = "INVALID_INPUT" | "MENU_UNAVAILABLE" | "PRICE_CHANGED" | "NOT_FOUND" | "INVALID_STATUS" | "STALE_STATUS";

export class OrderError extends Error {
  constructor(public readonly code: OrderErrorCode, message: string) {
    super(message);
    this.name = "OrderError";
  }
}

function orders(): Order[] {
  return readMockData<Order[]>(fileName, () => []);
}

function newestFirst(items: Order[]): Order[] {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allowedAdminOrderStatuses(status: OrderStatus): OrderStatus[] {
  const index = progress.indexOf(status);
  if (index < 0) return [];
  return [
    ...(index > 0 ? [progress[index - 1]] : []),
    ...(index < progress.length - 1 ? [progress[index + 1]] : []),
    ...(["received", "preparing"].includes(status) ? (["canceled"] as OrderStatus[]) : []),
  ];
}

export const mockOrderRepository = {
  async create(customer: { id: string; name: string }, input: CreateOrderInput): Promise<Order> {
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > maxItems ||
        !Number.isSafeInteger(input.expectedTotalAmount) || input.expectedTotalAmount < 0) {
      throw new OrderError("INVALID_INPUT", "주문 품목이나 총 금액이 올바르지 않습니다.");
    }
    if (!orderTypes.includes(input.orderType) || !paymentMethods.includes(input.paymentMethod)) {
      throw new OrderError("INVALID_INPUT", "수령 방식이나 결제 수단을 선택해 주세요.");
    }
    const request = typeof input.request === "string" ? input.request.trim() : "";
    if (request.length > MAX_ORDER_REQUEST_LENGTH) {
      throw new OrderError("INVALID_INPUT", `요청사항은 ${MAX_ORDER_REQUEST_LENGTH}자 이내로 입력해 주세요.`);
    }

    const menus = new Map((await mockMenuRepository.list()).map((menu) => [menu.id, menu]));
    const items: OrderItem[] = input.items.map(({ menuId, option, quantity }) => {
      if (typeof menuId !== "string" || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
        throw new OrderError("INVALID_INPUT", "주문 수량이 올바르지 않습니다.");
      }
      const menu = menus.get(menuId);
      if (!menu || !menu.available) {
        throw new OrderError("MENU_UNAVAILABLE", "판매하지 않는 메뉴가 포함되어 있습니다.");
      }
      const validOption = menu.temperatures.length === 0
        ? option === null
        : (option === "hot" || option === "ice") && menu.temperatures.includes(option);
      if (!validOption) {
        throw new OrderError("INVALID_INPUT", "메뉴 옵션이 올바르지 않습니다.");
      }
      const lineTotal = menu.price * quantity;
      if (!Number.isSafeInteger(lineTotal)) {
        throw new OrderError("INVALID_INPUT", "주문 금액이 올바르지 않습니다.");
      }
      return {
        menuId,
        option,
        quantity,
        menuName: menu.name,
        imageUrl: menu.imageUrl,
        unitPrice: menu.price,
        lineTotal,
      };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    if (!Number.isSafeInteger(totalAmount)) {
      throw new OrderError("INVALID_INPUT", "주문 금액이 올바르지 않습니다.");
    }
    if (totalAmount !== input.expectedTotalAmount) {
      throw new OrderError("PRICE_CHANGED", "메뉴 가격이 변경되었습니다. 장바구니 금액을 다시 확인해 주세요.");
    }

    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      items,
      totalAmount,
      status: "received",
      orderType: input.orderType,
      paymentMethod: input.paymentMethod,
      request,
      createdAt: now,
      updatedAt: now,
    };
    writeMockData(fileName, [...orders(), order]);
    return order;
  },

  async listByCustomer(customerId: string): Promise<Order[]> {
    return newestFirst(orders().filter((order) => order.customerId === customerId));
  },

  async getByCustomer(id: string, customerId: string): Promise<Order | null> {
    return orders().find((order) => order.id === id && order.customerId === customerId) ?? null;
  },

  async listAll(): Promise<Order[]> {
    return newestFirst(orders());
  },

  async get(id: string): Promise<Order | null> {
    return orders().find((order) => order.id === id) ?? null;
  },

  async changeStatus(id: string, expectedStatus: OrderStatus, nextStatus: OrderStatus): Promise<Order> {
    const all = orders();
    const order = all.find((item) => item.id === id);
    if (!order) throw new OrderError("NOT_FOUND", "주문을 찾을 수 없습니다.");
    if (order.status !== expectedStatus) {
      throw new OrderError("STALE_STATUS", "주문 상태가 이미 변경되었습니다. 목록을 새로고침해 주세요.");
    }
    if (!allowedAdminOrderStatuses(order.status).includes(nextStatus)) {
      throw new OrderError("INVALID_STATUS", "현재 상태에서 선택할 수 없는 주문 상태입니다.");
    }
    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    writeMockData(fileName, all);
    return order;
  },

  async cancelByCustomer(id: string, customerId: string): Promise<Order> {
    const all = orders();
    const order = all.find((item) => item.id === id && item.customerId === customerId);
    if (!order) throw new OrderError("NOT_FOUND", "주문을 찾을 수 없습니다.");
    if (order.status !== "received") {
      throw new OrderError("INVALID_STATUS", "접수된 주문만 취소할 수 있습니다.");
    }
    order.status = "canceled";
    order.updatedAt = new Date().toISOString();
    writeMockData(fileName, all);
    return order;
  },
};
