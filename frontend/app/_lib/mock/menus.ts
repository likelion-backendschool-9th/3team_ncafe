import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Menu = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  updatedAt: string;
};

export type MenuInput = Pick<Menu, "name" | "description" | "price" | "available">;

const fileName = "menus.json";

function menus(): Menu[] {
  return readMockData<Menu[]>(fileName, () => {
    const updatedAt = new Date().toISOString();
    return [
      { id: randomUUID(), name: "아메리카노", description: "진한 에스프레소와 물", price: 4500, available: true, updatedAt },
      { id: randomUUID(), name: "카페라떼", description: "에스프레소와 우유", price: 5000, available: true, updatedAt },
      { id: randomUUID(), name: "치즈케이크", description: "부드러운 치즈케이크", price: 6200, available: false, updatedAt },
    ];
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
    const menu: Menu = { ...input, id: randomUUID(), updatedAt: new Date().toISOString() };
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
