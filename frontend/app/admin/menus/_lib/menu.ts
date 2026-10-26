export const MENU_IMAGE_PLACEHOLDER = "/images/menus/placeholder.svg";
export const MENU_PAGE_SIZE = 20;

// 백엔드 MenuFields와 같은 규칙이다. 최종 판단은 백엔드 응답이다.
export const MENU_SLUG_MAX_LENGTH = 100;
export const MENU_NAME_MAX_LENGTH = 80;
export const MENU_DESCRIPTION_MAX_LENGTH = 500;
export const MENU_IMAGE_URL_MAX_LENGTH = 2048;
export const MENU_PRICE_MIN = 1;
export const MENU_PRICE_MAX = 1_000_000;
export const MENU_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MENU_IMAGE_URL_PATTERN = /^(https:\/\/\S+|\/images\/menus\/[a-zA-Z0-9/_-]+\.(svg|png|jpe?g|webp))$/;

export const MENU_SORTS = ["newest", "oldest", "name", "price-low", "price-high"] as const;
export const MENU_STATUSES = ["available", "unavailable"] as const;

export type MenuSort = (typeof MENU_SORTS)[number];
export type MenuStatus = (typeof MENU_STATUSES)[number];

export type MenuResponse = {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  categoryId: number;
  categoryName: string;
  available: boolean;
  isNew: boolean;
  recommended: boolean;
  supportsHot: boolean;
  supportsIced: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuPageResponse = { items: MenuResponse[]; page: number; size: number; totalElements: number; totalPages: number };

export const sortLabels: Record<MenuSort, string> = {
  newest: "최신순", oldest: "오래된순", name: "메뉴명순", "price-low": "가격 낮은순", "price-high": "가격 높은순",
};
export const statusLabels: Record<MenuStatus, string> = { available: "판매 중", unavailable: "판매 중지" };

export const isMenuSort = (value: unknown): value is MenuSort => (MENU_SORTS as readonly unknown[]).includes(value);
export const isMenuStatus = (value: unknown): value is MenuStatus => (MENU_STATUSES as readonly unknown[]).includes(value);

export function temperatureLabel(menu: Pick<MenuResponse, "supportsHot" | "supportsIced">): string {
  const labels = [...(menu.supportsHot ? ["핫"] : []), ...(menu.supportsIced ? ["아이스"] : [])];
  return labels.length > 0 ? labels.join(", ") : "온도 구분 없음";
}
