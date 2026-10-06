// 백엔드 응답 모양 — backend/src/main/java/com/newlecture/backend/dto 와 1:1.

export type Member = { id: number; username: string; name: string; email: string; role: "member" | "admin" };

export type Category = { id: number; name: string; count: number };

export type MenuStatus = "on" | "soldout" | "hidden";

export type MenuSummary = {
  id: number;
  slug: string;
  korName: string;
  engName: string;
  price: number;
  categoryId: number;
  categoryName: string;
  status: MenuStatus;
  isNew: boolean;
  imgSrc: string | null;
  favoriteCount: number;
  createdAt: string;
};

export type MenuOption = { kind: "temperature" | "size"; name: string; extraPrice: number; isDefault: boolean };

export type Nutrition = {
  kcal: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  satFatG: number | null;
  proteinG: number | null;
  caffeineMg: number | null;
};

export type MenuDetail = MenuSummary & {
  description: string;
  detail: string;
  images: string[];
  options: MenuOption[];
  nutrition: Nutrition | null;
  notices: string[];
  favorite: boolean;
  related: MenuSummary[];
  updatedAt: string;
};

export type Page<T> = { items: T[]; page: number; size: number; total: number; totalPages: number };

export type Favorite = { menu: MenuSummary; createdAt: string };

export type BasketItem = {
  id: number;
  menuId: number;
  slug: string;
  korName: string;
  imgSrc: string | null;
  temperature: string | null;
  size: string | null;
  unitPrice: number;
  quantity: number;
  price: number;
  orderable: boolean;
};
export type Basket = { items: BasketItem[]; itemTotal: number };

export type OrderStatus = "waiting" | "preparing" | "done" | "canceled";
export type OrderItem = {
  menuId: number;
  slug: string;
  menuName: string;
  imgSrc: string | null;
  temperature: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  price: number;
};
export type Order = {
  id: number;
  orderNo: string;
  status: OrderStatus;
  itemTotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  items: OrderItem[];
  createdAt: string;
};

export type MenuHistory = { content: string; actor: string | null; createdAt: string };
export type AdminMenuDetail = {
  menu: MenuDetail;
  stats: { orderCount: number; weekOrderCount: number; favoriteCount: number; basketCount: number };
  history: MenuHistory[];
};

export type MenuForm = {
  slug: string;
  categoryId: number;
  korName: string;
  engName: string;
  price: number;
  description: string;
  detail: string;
  status: MenuStatus;
  isNew: boolean;
  options: MenuOption[];
  notices: string[];
};

export type Dashboard = {
  todayOrders: number;
  todaySales: number;
  preparing: number;
  newMembersThisWeek: number;
  menusOn: number;
  menusSoldout: number;
  menusHidden: number;
  recentOrders: { orderNo: string; customer: string; summary: string; total: number; status: OrderStatus; createdAt: string }[];
  ranks: { menuId: number; name: string; count: number; ratio: number }[];
};
