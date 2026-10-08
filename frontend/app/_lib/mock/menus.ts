import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Temperature = "hot" | "ice";

export type Menu = {
  id: string;
  name: string;
  nameEn: string;
  imageUrl: string;
  description: string;
  categories: string[];
  price: number;
  available: boolean;
  isNew: boolean;
  recommended: boolean;
  temperatures: Temperature[];
  createdAt: string;
  updatedAt: string;
};

export type MenuInput = Pick<Menu, "name" | "nameEn" | "imageUrl" | "description" | "categories" | "price" | "available" | "isNew" | "recommended" | "temperatures">;

const fileName = "menus.json";
export const MENU_IMAGE_PLACEHOLDER = "/images/menus/placeholder.svg";
const menuImageUrls: Record<string, string> = {
  아메리카노: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
  카페라떼: "https://images.unsplash.com/photo-1643245253892-11f9af8a7306?auto=format&fit=crop&w=900&q=80",
  치즈케이크: "https://images.unsplash.com/photo-1779608993337-fc83f391bbed?auto=format&fit=crop&w=900&q=80",
  쌍화차: "https://godomall.speedycdn.net/735670b9a8c2322bfcb81dbc356e372d/goods/198/image/detail/198_detail_057.jpg",
  생강차: "https://hannaone.com/wp-content/uploads/2017/05/Saenggang-Cha-Korean-Ginger-Tea.jpg",
};
const legacySeedFields: Record<string, { nameEn: string; categories: string[]; imageUrl: string; recommended: boolean }> = {
  아메리카노: { nameEn: "Americano", categories: ["커피"], imageUrl: menuImageUrls["아메리카노"], recommended: true },
  카페라떼: { nameEn: "Cafe Latte", categories: ["커피"], imageUrl: menuImageUrls["카페라떼"], recommended: false },
  치즈케이크: { nameEn: "Cheesecake", categories: ["디저트"], imageUrl: menuImageUrls["치즈케이크"], recommended: false },
};

function menus(): Menu[] {
  const stored = readMockData<Menu[]>(fileName, () => {
    const createdAt = new Date().toISOString();
    return [
      { id: randomUUID(), name: "다방커피", nameEn: "Dabang Coffee", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "커피 둘, 설탕 둘, 프림 둘. 그 시절 다방 그대로의 달달한 커피", categories: ["커피"], price: 3500, available: true, isNew: false, recommended: true, temperatures: ["hot", "ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "밀크 커피", nameEn: "Milk Coffee", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "따끈한 우유에 커피를 듬뿍 탄 부드러운 밀크 커피", categories: ["커피"], price: 4000, available: true, isNew: false, recommended: false, temperatures: ["hot", "ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "쌍화차", nameEn: "Ssanghwacha", imageUrl: menuImageUrls["쌍화차"], description: "노른자 동동 띄우고 잣·대추 듬뿍 올린 다방 쌍화차", categories: ["차"], price: 6000, available: true, isNew: false, recommended: true, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "생강차", nameEn: "Ginger Tea", imageUrl: menuImageUrls["생강차"], description: "알싸하고 따뜻한 국산 생강을 우려낸 차", categories: ["차"], price: 4500, available: true, isNew: false, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "율무차", nameEn: "Job's Tears Tea", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "고소하고 걸쭉한 율무차에 견과를 솔솔 뿌려 드려요", categories: ["차"], price: 4000, available: true, isNew: true, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "칡즙", nameEn: "Arrowroot Juice", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "쌉싸름한 뒷맛이 개운한 국산 칡즙", categories: ["논커피"], price: 5000, available: false, isNew: false, recommended: false, temperatures: ["ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "오렌지 쥬스", nameEn: "Orange Juice", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "유리잔에 얼음 동동, 새콤달콤 오렌지 쥬스", categories: ["논커피"], price: 4500, available: true, isNew: false, recommended: false, temperatures: ["ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "카스테라", nameEn: "Castella", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "촉촉하고 폭신한 옛날 카스테라 한 조각", categories: ["디저트"], price: 4000, available: true, isNew: false, recommended: true, temperatures: [], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "계란후라이", nameEn: "Fried Egg", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "노른자를 살짝 익힌 반숙 계란후라이, 모닝커피와 함께", categories: ["기타"], price: 2000, available: true, isNew: false, recommended: false, temperatures: [], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "깨죽", nameEn: "Sesame Porridge", imageUrl: MENU_IMAGE_PLACEHOLDER, description: "검은깨를 곱게 갈아 쑨 고소한 깨죽", categories: ["기타"], price: 5500, available: true, isNew: true, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
    ];
  });
  // Older local mock records predate these fields; keep them readable.
  return stored.map((menu) => {
    const legacy = legacySeedFields[menu.name];
    const legacyCategory = (menu as unknown as { category?: string }).category;
    return {
      ...menu,
      nameEn: menu.nameEn ?? legacy?.nameEn ?? "",
      imageUrl: menu.imageUrl ?? legacy?.imageUrl ?? MENU_IMAGE_PLACEHOLDER,
      categories: menu.categories ?? (legacyCategory ? [legacyCategory] : legacy?.categories ?? ["미분류"]),
      isNew: menu.isNew ?? false,
      recommended: menu.recommended ?? legacy?.recommended ?? false,
      temperatures: menu.temperatures ?? [],
      createdAt: menu.createdAt ?? menu.updatedAt,
    };
  });
}

// The same adapter can serve the future admin and customer menu screens.
export const mockMenuRepository = {
  async list(): Promise<Menu[]> {
    return menus();
  },

  async get(id: string): Promise<Menu | null> {
    return menus().find((menu) => menu.id === id) ?? null;
  },

  async create(input: MenuInput): Promise<Menu> {
    const createdAt = new Date().toISOString();
    const menu: Menu = { ...input, id: randomUUID(), createdAt, updatedAt: createdAt };
    writeMockData(fileName, [...menus(), menu]);
    return menu;
  },

  async update(id: string, input: Partial<MenuInput>): Promise<Menu | null> {
    const allMenus = menus();
    const index = allMenus.findIndex((menu) => menu.id === id);
    if (index < 0) return null;

    const updated = { ...allMenus[index], ...input, updatedAt: new Date().toISOString() };
    allMenus[index] = updated;
    writeMockData(fileName, allMenus);
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const allMenus = menus();
    const remaining = allMenus.filter((menu) => menu.id !== id);
    if (remaining.length === allMenus.length) return false;
    writeMockData(fileName, remaining);
    return true;
  },
};
