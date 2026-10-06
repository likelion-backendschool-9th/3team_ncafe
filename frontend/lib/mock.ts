// 목업 데이터 — 모양은 백엔드 DTO(lib/types.ts)와 같고, 값은 db/seed.sql 과 같다.
// 페이지는 여기서 읽어 그리기만 한다. 나중에 API 로 바꿀 때는 이 상수를 fetch 결과로 갈아 끼우면 된다.
import type {
  AdminMenuDetail,
  Basket,
  Category,
  Dashboard,
  Favorite,
  Member,
  MenuDetail,
  MenuSummary,
  Order,
  Page,
} from "./types";

export const USER: Member = { id: 2, username: "hong", name: "홍길동", email: "hong@example.com", role: "member" };
export const ADMIN: Member = { id: 1, username: "admin", name: "관리자", email: "admin@ncafe.kr", role: "admin" };

// GET /api/categories — count 는 공개(hidden 제외) 메뉴 수
export const CATEGORIES: Category[] = [
  { id: 1, name: "커피", count: 5 },
  { id: 2, name: "티", count: 2 },
  { id: 3, name: "에이드 · 스무디", count: 2 },
  { id: 4, name: "디저트", count: 2 },
];

const menu = (
  id: number,
  slug: string,
  korName: string,
  engName: string,
  categoryId: number,
  price: number,
  createdAt: string,
  extra: Partial<MenuSummary> = {},
): MenuSummary => ({
  id,
  slug,
  korName,
  engName,
  price,
  categoryId,
  categoryName: CATEGORIES.find((c) => c.id === categoryId)!.name,
  status: "on",
  isNew: false,
  imgSrc: `/images/menus/${slug}.svg`,
  favoriteCount: 0,
  createdAt,
  ...extra,
});

// menus 표 전부(id 순). 레몬에이드는 비공개, 크루아상은 품절, 스무디 둘은 신메뉴. favoriteCount 는 favorites 표 기준(홍길동 4개).
export const ALL_MENUS: MenuSummary[] = [
  menu(20, "iced-americano", "아이스 아메리카노", "Iced Americano", 1, 3800, "2026-08-05T09:00:00+09:00", { favoriteCount: 1 }),
  menu(21, "cappuccino", "카푸치노", "Cappuccino", 1, 4500, "2026-08-01T09:00:00+09:00"),
  menu(22, "americano", "아메리카노", "Americano", 1, 3500, "2026-08-10T09:00:00+09:00"),
  menu(23, "latte", "카페라떼", "Caffe Latte", 1, 4500, "2026-08-15T09:30:00+09:00", { favoriteCount: 1 }),
  menu(24, "vanilla-latte", "바닐라라떼", "Vanilla Latte", 1, 5000, "2026-08-20T09:00:00+09:00"),
  menu(25, "green-tea", "녹차", "Green Tea", 2, 3800, "2026-08-25T09:00:00+09:00"),
  menu(26, "earl-grey", "얼그레이", "Earl Grey", 2, 4000, "2026-08-28T09:00:00+09:00"),
  menu(27, "lemonade", "레몬에이드", "Lemonade", 3, 4800, "2026-09-01T09:00:00+09:00", { status: "hidden" }),
  menu(28, "strawberry-smoothie", "딸기 스무디", "Strawberry Smoothie", 3, 5800, "2026-09-05T09:00:00+09:00", { isNew: true, favoriteCount: 1 }),
  menu(29, "cheesecake", "뉴욕 치즈케이크", "New York Cheesecake", 4, 6200, "2026-09-08T09:00:00+09:00", { favoriteCount: 1 }),
  menu(30, "croissant", "버터 크루아상", "Butter Croissant", 4, 3900, "2026-09-10T09:00:00+09:00", { status: "soldout" }),
  menu(31, "mango-smoothie", "망고 스무디", "Mango Smoothie", 3, 5800, "2026-09-12T09:00:00+09:00", { isNew: true }),
];

export const menuBySlug = (slug: string) => ALL_MENUS.find((m) => m.slug === slug)!;
export const menuById = (id: number) => ALL_MENUS.find((m) => m.id === id)!;

// GET /api/menus — 공개 목록(hidden 제외, 12개씩)
export const MENUS: Page<MenuSummary> = (() => {
  const items = ALL_MENUS.filter((m) => m.status !== "hidden");
  return { items, page: 1, size: 12, total: items.length, totalPages: 1 };
})();

// GET /api/menus/latte
export const MENU_DETAIL: MenuDetail = {
  ...menuBySlug("latte"),
  description:
    "진하게 추출한 에스프레소에 부드럽게 스팀한 우유를 더해 고소하고 균형 잡힌 맛을 느낄 수 있는 NCafe의 대표 라떼입니다.",
  detail:
    "NCafe 카페라떼는 브라질과 콜롬비아 원두를 블렌딩한 하우스 블렌드 에스프레소를 사용합니다. 매장에서 매일 아침 로스팅 상태를 확인하고 최상의 상태로 추출합니다. 우유는 국내산 1등급 원유만 사용하며, 65도 내외로 스티밍하여 부드러운 단맛을 살렸습니다.\n\nHOT 은 머그 또는 종이컵으로, ICE 는 얼음과 함께 투명 컵으로 제공됩니다. 시럽 추가, 샷 추가 등은 매장 주문 시 요청하실 수 있습니다.",
  images: ["/images/menus/latte.svg", "/images/menus/cappuccino.svg", "/images/menus/vanilla-latte.svg"],
  options: [
    { kind: "temperature", name: "HOT", extraPrice: 0, isDefault: true },
    { kind: "temperature", name: "ICE", extraPrice: 0, isDefault: false },
    { kind: "size", name: "Regular", extraPrice: 0, isDefault: true },
    { kind: "size", name: "Large", extraPrice: 500, isDefault: false },
  ],
  nutrition: { kcal: 180, sodiumMg: 115, sugarG: 13.0, satFatG: 4.5, proteinG: 9.0, caffeineMg: 75 },
  notices: [
    "우유가 포함된 제품입니다. 유당 불내증이 있는 경우 두유 변경을 요청해 주세요.",
    "온라인 주문 후 30분 이내에 매장에서 픽업해 주세요.",
    "제조 시작 이후에는 주문 취소가 불가능합니다.",
  ],
  favorite: true,
  // 같은 카테고리의 다른 메뉴 4개, 최신 등록순
  related: [menuBySlug("vanilla-latte"), menuBySlug("americano"), menuBySlug("iced-americano"), menuBySlug("cappuccino")],
  updatedAt: "2026-09-02T14:20:00+09:00",
};

// GET /api/my/favorites — 최신순
export const FAVORITES: Favorite[] = [
  { menu: menuBySlug("iced-americano"), createdAt: "2026-09-14T20:10:00+09:00" },
  { menu: menuBySlug("latte"), createdAt: "2026-09-12T08:30:00+09:00" },
  { menu: menuBySlug("strawberry-smoothie"), createdAt: "2026-09-08T13:00:00+09:00" },
  { menu: menuBySlug("cheesecake"), createdAt: "2026-09-01T19:45:00+09:00" },
];

// GET /api/my/basket — unitPrice 는 옵션 추가금 포함
export const BASKET: Basket = {
  items: [
    { id: 1, menuId: 23, slug: "latte", korName: "카페라떼", imgSrc: "/images/menus/latte.svg", temperature: "HOT", size: "Regular", unitPrice: 4500, quantity: 2, price: 9000, orderable: true },
    { id: 2, menuId: 20, slug: "iced-americano", korName: "아이스 아메리카노", imgSrc: "/images/menus/iced-americano.svg", temperature: "ICE", size: "Large", unitPrice: 4300, quantity: 1, price: 4300, orderable: true },
    { id: 3, menuId: 29, slug: "cheesecake", korName: "뉴욕 치즈케이크", imgSrc: "/images/menus/cheesecake.svg", temperature: null, size: null, unitPrice: 6200, quantity: 1, price: 6200, orderable: true },
  ],
  itemTotal: 19500,
};

const item = (slug: string, temperature: string | null, size: string | null, quantity: number, unitPrice: number) => {
  const m = menuBySlug(slug);
  return { menuId: m.id, slug, menuName: m.korName, imgSrc: m.imgSrc, temperature, size, quantity, unitPrice, price: unitPrice * quantity };
};

// GET /api/my/orders?months=1 — 홍길동, 최신순
export const ORDERS: Order[] = [
  { id: 9, orderNo: "20260916-000128", status: "preparing", itemTotal: 15200, discount: 0, total: 15200, couponCode: null, createdAt: "2026-09-16T08:36:00+09:00",
    items: [item("latte", "HOT", "Regular", 2, 4500), item("cheesecake", null, null, 1, 6200)] },
  { id: 4, orderNo: "20260915-000312", status: "preparing", itemTotal: 15200, discount: 0, total: 15200, couponCode: null, createdAt: "2026-09-15T08:42:00+09:00",
    items: [item("latte", "HOT", "Regular", 2, 4500), item("cheesecake", null, null, 1, 6200)] },
  { id: 3, orderNo: "20260911-000198", status: "done", itemTotal: 4300, discount: 0, total: 4300, couponCode: null, createdAt: "2026-09-11T13:10:00+09:00",
    items: [item("iced-americano", "ICE", "Large", 1, 4300)] },
  { id: 2, orderNo: "20260904-000077", status: "done", itemTotal: 13600, discount: 0, total: 13600, couponCode: null, createdAt: "2026-09-04T17:55:00+09:00",
    items: [item("strawberry-smoothie", null, "Regular", 1, 5800), item("croissant", null, null, 2, 3900)] },
  { id: 1, orderNo: "20260828-000021", status: "canceled", itemTotal: 3500, discount: 0, total: 3500, couponCode: null, createdAt: "2026-08-28T09:20:00+09:00",
    items: [item("americano", "HOT", "Regular", 1, 3500)] },
];

// GET /api/admin/dashboard — 시드 기준 집계(오늘 = 2026-09-16)
export const DASHBOARD: Dashboard = {
  todayOrders: 5,
  todaySales: 41900,   // 취소(000124) 제외
  preparing: 2,
  newMembersThisWeek: 3,
  menusOn: 10,
  menusSoldout: 1,
  menusHidden: 1,
  recentOrders: [
    { orderNo: "20260916-000128", customer: "홍길동", summary: "카페라떼 외 1", total: 15200, status: "preparing", createdAt: "2026-09-16T08:36:00+09:00" },
    { orderNo: "20260916-000127", customer: "김민수", summary: "아이스 아메리카노", total: 3800, status: "waiting", createdAt: "2026-09-16T08:30:00+09:00" },
    { orderNo: "20260916-000126", customer: "이서연", summary: "딸기 스무디 외 2", total: 18900, status: "done", createdAt: "2026-09-16T08:15:00+09:00" },
    { orderNo: "20260916-000125", customer: "박지훈", summary: "얼그레이", total: 4000, status: "done", createdAt: "2026-09-16T08:05:00+09:00" },
    { orderNo: "20260916-000124", customer: "최유진", summary: "뉴욕 치즈케이크 외 1", total: 10700, status: "canceled", createdAt: "2026-09-16T07:50:00+09:00" },
  ],
  // order_items 판매 수량 합(취소 제외), 1등 = 100
  ranks: [
    { menuId: 23, name: "카페라떼", count: 4, ratio: 100 },
    { menuId: 30, name: "버터 크루아상", count: 4, ratio: 100 },
    { menuId: 28, name: "딸기 스무디", count: 2, ratio: 50 },
    { menuId: 20, name: "아이스 아메리카노", count: 2, ratio: 50 },
    { menuId: 29, name: "뉴욕 치즈케이크", count: 2, ratio: 50 },
  ],
};

// GET /api/admin/menus — 비공개 포함, 최신 등록(id 내림차순), 10개씩
export const ADMIN_MENUS: Page<MenuSummary> = (() => {
  const all = [...ALL_MENUS].sort((a, b) => b.id - a.id);
  return { items: all.slice(0, 10), page: 1, size: 10, total: all.length, totalPages: 2 };
})();

// GET /api/admin/menus/23
export const ADMIN_MENU_DETAIL: AdminMenuDetail = {
  menu: { ...MENU_DETAIL, favorite: false },
  stats: { orderCount: 2, weekOrderCount: 2, favoriteCount: 1, basketCount: 1 },
  history: [
    { content: "가격 변경 4,300원 → 4,500원", actor: "관리자", createdAt: "2026-09-02T14:20:00+09:00" },
    { content: "대표 이미지 변경", actor: "관리자", createdAt: "2026-08-20T10:05:00+09:00" },
    { content: "메뉴 등록", actor: "관리자", createdAt: "2026-08-15T09:30:00+09:00" },
  ],
};
