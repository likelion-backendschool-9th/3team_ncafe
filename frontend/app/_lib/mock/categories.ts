import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

const fileName = "categories.json";
const defaultNames = ["커피", "논커피", "차", "디저트", "기타"];

function categories(): Category[] {
  return readMockData<Category[]>(fileName, () => {
    const createdAt = new Date().toISOString();
    return defaultNames.map((name) => ({ id: randomUUID(), name, createdAt }));
  });
}

export const mockCategoryRepository = {
  async list(): Promise<Category[]> {
    return categories();
  },

  async create(name: string): Promise<Category> {
    const trimmed = name.trim();
    const all = categories();
    if (all.some((category) => category.name === trimmed)) {
      throw new Error("이미 존재하는 카테고리입니다.");
    }
    const category: Category = { id: randomUUID(), name: trimmed, createdAt: new Date().toISOString() };
    writeMockData(fileName, [...all, category]);
    return category;
  },

  async rename(id: string, name: string): Promise<Category | null> {
    const trimmed = name.trim();
    const all = categories();
    if (all.some((category) => category.id !== id && category.name === trimmed)) {
      throw new Error("이미 존재하는 카테고리입니다.");
    }
    const index = all.findIndex((category) => category.id === id);
    if (index < 0) return null;
    all[index] = { ...all[index], name: trimmed };
    writeMockData(fileName, all);
    return all[index];
  },

  async remove(id: string): Promise<boolean> {
    const all = categories();
    const remaining = all.filter((category) => category.id !== id);
    if (remaining.length === all.length) return false;
    writeMockData(fileName, remaining);
    return true;
  },

  // 목록에 저장된 배열 순서 자체가 화면에 보여줄 순서
  async move(id: string, direction: "up" | "down"): Promise<Category[]> {
    const all = categories();
    const index = all.findIndex((category) => category.id === id);
    if (index < 0) return all;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= all.length) return all;
    [all[index], all[target]] = [all[target], all[index]];
    writeMockData(fileName, all);
    return all;
  },

  // 드래그 앤 드롭 등으로 전체 순서를 한 번에 재배치할 때 사용
  async reorder(orderedIds: string[]): Promise<Category[]> {
    const all = categories();
    const byId = new Map(all.map((category) => [category.id, category]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter((category): category is Category => !!category);
    // 넘어오지 않은 항목(동시 추가 등)은 끝에 그대로 유지
    const missing = all.filter((category) => !orderedIds.includes(category.id));
    const result = [...reordered, ...missing];
    writeMockData(fileName, result);
    return result;
  },
};
