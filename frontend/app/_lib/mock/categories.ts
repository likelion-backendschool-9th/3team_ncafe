import { randomUUID } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

// 카테고리를 삭제하면 그 카테고리의 메뉴가 옮겨 가는 기본 카테고리. 수정·삭제할 수 없다.
export const FALLBACK_CATEGORY_NAME = "기타";

const fileName = "categories.json";
const defaultNames = ["커피", "차", "쥬스", "다과", "세트", FALLBACK_CATEGORY_NAME];

function categories(): Category[] {
  const all = readMockData<Category[]>(fileName, () => {
    const createdAt = new Date().toISOString();
    return defaultNames.map((name) => ({ id: randomUUID(), name, createdAt }));
  });
  // 기타가 생기기 전에 만들어진 로컬 데이터에도 기타를 채워 넣는다.
  if (!all.some((category) => category.name === FALLBACK_CATEGORY_NAME)) {
    all.push({ id: randomUUID(), name: FALLBACK_CATEGORY_NAME, createdAt: new Date().toISOString() });
    writeMockData(fileName, all);
  }
  return all;
}

export function isFallbackCategory(category: Category): boolean {
  return category.name === FALLBACK_CATEGORY_NAME;
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
    if (isFallbackCategory(all[index])) throw new Error(`${FALLBACK_CATEGORY_NAME} 카테고리는 수정할 수 없습니다.`);
    all[index] = { ...all[index], name: trimmed };
    writeMockData(fileName, all);
    return all[index];
  },

  // 지운 카테고리를 반환해 호출하는 쪽에서 그 이름을 쓰던 메뉴를 옮길 수 있게 한다.
  async remove(id: string): Promise<Category | null> {
    const all = categories();
    const target = all.find((category) => category.id === id);
    if (!target) return null;
    if (isFallbackCategory(target)) throw new Error(`${FALLBACK_CATEGORY_NAME} 카테고리는 삭제할 수 없습니다.`);
    writeMockData(fileName, all.filter((category) => category.id !== id));
    return target;
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
