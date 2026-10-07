import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Menu = {
  id: string;
  name: string;
  nameEn: string;
  imageUrl: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  isNew: boolean;
  recommended: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuInput = Pick<Menu, "name" | "nameEn" | "imageUrl" | "description" | "category" | "price" | "available" | "isNew" | "recommended">;

const fileName = "menus.json";
export const MENU_IMAGE_PLACEHOLDER = "/images/menus/placeholder.svg";
const legacySeedFields: Record<string, { nameEn: string; category: string; imageUrl: string; recommended: boolean }> = {
  아메리카노: { nameEn: "Americano", category: "커피", imageUrl: "/images/menus/americano.svg", recommended: true },
  카페라떼: { nameEn: "Cafe Latte", category: "커피", imageUrl: "/images/menus/latte.svg", recommended: false },
  치즈케이크: { nameEn: "Cheesecake", category: "디저트", imageUrl: "/images/menus/cheesecake.svg", recommended: false },
};

function menus(): Menu[] {
  const stored = readMockData<Menu[]>(fileName, () => {
    const createdAt = new Date().toISOString();
    return [
      { id: randomUUID(), name: "아메리카노", nameEn: "Americano", imageUrl: "/images/menus/americano.svg", description: "진한 에스프레소와 물", category: "커피", price: 4500, available: true, isNew: false, recommended: true, createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "카페라떼", nameEn: "Cafe Latte", imageUrl: "/images/menus/latte.svg", description: "에스프레소와 우유", category: "커피", price: 5000, available: true, isNew: true, recommended: false, createdAt, updatedAt: createdAt },
      { id: randomUUID(), name: "치즈케이크", nameEn: "Cheesecake", imageUrl: "/images/menus/cheesecake.svg", description: "부드러운 치즈케이크", category: "디저트", price: 6200, available: false, isNew: false, recommended: false, createdAt, updatedAt: createdAt },
    ];
  });
  // Older local mock records predate these fields; keep them readable.
  return stored.map((menu) => {
    const legacy = legacySeedFields[menu.name];
    return {
      ...menu,
      nameEn: menu.nameEn ?? legacy?.nameEn ?? "",
      imageUrl: menu.imageUrl ?? legacy?.imageUrl ?? MENU_IMAGE_PLACEHOLDER,
      category: menu.category ?? legacy?.category ?? "미분류",
      isNew: menu.isNew ?? false,
      recommended: menu.recommended ?? legacy?.recommended ?? false,
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
