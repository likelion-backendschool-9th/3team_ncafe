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
  십전대보탕: "https://recipe1.ezmember.co.kr/cache/recipe/2020/12/02/999a2203eb6e4dc3df0b3aebff4077ee1.jpg",
  쌍화차: "https://godomall.speedycdn.net/735670b9a8c2322bfcb81dbc356e372d/goods/198/image/detail/198_detail_057.jpg",
  생강차: "https://hannaone.com/wp-content/uploads/2017/05/Saenggang-Cha-Korean-Ginger-Tea.jpg",
  인삼차: "https://cdn.yemek.com/uploads/2024/03/ginseng-cayi-shutter.jpg",
  홍삼차: "https://www.kankokuichiba.jp/cdn/shop/files/03_e1806bc7-b20c-4575-b0ff-312a9a5af3b5.jpg?v=1685349525&width=900",
  대추차: "https://cdn.imweb.me/thumbnail/20250729/303572059060a.jpg",
  모과차: "https://images.unsplash.com/photo-1707763531064-d7c5a275d6b3?auto=format&fit=crop&w=900&q=80",
  오미자차: "https://img.choroc.com/newshop/goods/025299/025299_1.jpg",
  "수제 단팥죽": "https://www.korean-culture.org/CONTENTS/BOARD/images/2patjuk_finish_L1.jpg",
  "수제 모나카": "https://www.chowhound.com/img/gallery/16-unique-traditional-japanese-desserts/monaka-1740493199.jpg",
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
      { id: randomUUID(), name: "아메리카노", nameEn: "Americano", imageUrl: menuImageUrls["아메리카노"], description: "진한 에스프레소와 물", categories: ["커피"], price: 4500, available: true, isNew: false, recommended: true, temperatures: ["hot", "ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "카페라떼", nameEn: "Cafe Latte", imageUrl: menuImageUrls["카페라떼"], description: "에스프레소와 우유", categories: ["커피"], price: 5000, available: true, isNew: true, recommended: false, temperatures: ["hot", "ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "치즈케이크", nameEn: "Cheesecake", imageUrl: menuImageUrls["치즈케이크"], description: "부드러운 치즈케이크", categories: ["디저트"], price: 6200, available: false, isNew: false, recommended: false, temperatures: [], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "십전대보탕", nameEn: "Sipjeon-daebotang", imageUrl: menuImageUrls["십전대보탕"], description: "열 가지 한약재를 달여 보양이 되는 다방 대표 보양차", categories: ["차"], price: 7000, available: true, isNew: false, recommended: true, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "쌍화차", nameEn: "Ssanghwacha", imageUrl: menuImageUrls["쌍화차"], description: "노른자 동동 띄운 그 시절 다방 쌍화차", categories: ["차"], price: 6000, available: true, isNew: false, recommended: true, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "생강차", nameEn: "Ginger Tea", imageUrl: menuImageUrls["생강차"], description: "알싸하고 따뜻한 국산 생강을 우려낸 차", categories: ["차"], price: 4500, available: true, isNew: false, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "인삼차", nameEn: "Ginseng Tea", imageUrl: menuImageUrls["인삼차"], description: "쌉쌀하고 깊은 향의 고려 인삼차", categories: ["차"], price: 5500, available: true, isNew: false, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "홍삼차", nameEn: "Red Ginseng Tea", imageUrl: menuImageUrls["홍삼차"], description: "은은하게 단맛이 도는 홍삼 보양차", categories: ["차"], price: 6000, available: true, isNew: true, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "대추차", nameEn: "Jujube Tea", imageUrl: menuImageUrls["대추차"], description: "푹 고아낸 대추의 자연스러운 단맛", categories: ["차"], price: 4800, available: true, isNew: false, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "모과차", nameEn: "Quince Tea", imageUrl: menuImageUrls["모과차"], description: "새콤달콤 향긋한 모과청을 우려낸 차", categories: ["차"], price: 4800, available: true, isNew: false, recommended: false, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "오미자차", nameEn: "Omija Tea", imageUrl: menuImageUrls["오미자차"], description: "다섯 가지 맛이 어우러진 상큼한 오미자차", categories: ["차"], price: 4800, available: true, isNew: true, recommended: false, temperatures: ["hot", "ice"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "수제 단팥죽", nameEn: "Handmade Red Bean Porridge", imageUrl: menuImageUrls["수제 단팥죽"], description: "매일 아침 직접 쑤는 뜨끈한 단팥죽, 새알심 한가득", categories: ["디저트"], price: 6500, available: true, isNew: true, recommended: true, temperatures: ["hot"], createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "수제 모나카", nameEn: "Handmade Monaka", imageUrl: menuImageUrls["수제 모나카"], description: "바삭한 웨하스 사이 직접 만든 아이스크림을 채운 모나카", categories: ["디저트"], price: 4500, available: true, isNew: true, recommended: false, temperatures: [], createdAt, updatedAt: createdAt },
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
