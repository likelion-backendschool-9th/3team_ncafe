// 백엔드 dto/cartitems의 CartItemResponse·CartItemsResponse와 이름·타입을 맞춘다.
export type CartTemperature = "hot" | "iced";

export type CartItemResponse = {
  id: number;
  menuId: number;
  slug: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  temperature: CartTemperature | null;
  quantity: number;
  lineTotal: number;
  orderable: boolean;
};

export type CartItemsResponse = {
  items: CartItemResponse[];
  totalQuantity: number;
  totalAmount: number;
};
