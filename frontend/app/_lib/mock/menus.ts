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
const rasterMenuImages = new Set([
  "persimmon-vinegar", "set-jujube", "set-boyang", "perilla-seed-tea", "strawberry-juice", "yam-tea",
  "green-tea", "black-tea", "arrowroot-tea", "jobs-tears-tea", "sansuyu", "solomons-seal-tea", "yuja-tea",
  "arrowroot-juice", "fresh-arrowroot-juice", "honey-tea", "mugwort-tea", "ginkgo-tea", "cocoa", "milk",
  "orange-juice", "maesil-juice", "tomato-juice", "castella", "fried-egg", "sesame-porridge", "set-morning",
  "set-ssanghwa", "set-yuja", "set-strawberry", "coffee", "ginger-tea", "ginseng-tea", "ssanghwacha",
  "jujube-tea", "monaka",
]);
const menuImageUrls: Record<string, string> = {
  아메리카노: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
  카페라떼: "https://images.unsplash.com/photo-1643245253892-11f9af8a7306?auto=format&fit=crop&w=900&q=80",
  치즈케이크: "https://images.unsplash.com/photo-1779608993337-fc83f391bbed?auto=format&fit=crop&w=900&q=80",
};
const legacySeedFields: Record<string, { nameEn: string; categories: string[]; imageUrl: string; recommended: boolean }> = {
  아메리카노: { nameEn: "Americano", categories: ["커피"], imageUrl: menuImageUrls["아메리카노"], recommended: true },
  카페라떼: { nameEn: "Cafe Latte", categories: ["커피"], imageUrl: menuImageUrls["카페라떼"], recommended: false },
  치즈케이크: { nameEn: "Cheesecake", categories: ["다과"], imageUrl: menuImageUrls["치즈케이크"], recommended: false },
};

type SeedMenu = Pick<Menu, "name" | "nameEn" | "description" | "categories" | "price" | "temperatures"> & {
  image: string;
  available?: boolean;
  isNew?: boolean;
  recommended?: boolean;
};

// 배열 순서가 기본 정렬(최근 등록순) 순서이고, 첫 개시(isNew) 메뉴는 가장 최근 등록으로 맨 앞에 온다
const seedMenus: SeedMenu[] = [
  { name: "커피", nameEn: "Dabang Coffee", image: "coffee", description: "커피 둘, 설탕 둘, 프림 둘. 그 시절 다방 그대로의 달달한 커피", categories: ["커피"], price: 3500, recommended: true, temperatures: ["hot", "ice"] },
  { name: "녹차", nameEn: "Green Tea", image: "green-tea", description: "은은한 향과 쌉싸름한 끝맛의 맑은 녹차", categories: ["차"], price: 4000, temperatures: ["hot", "ice"] },
  { name: "홍차", nameEn: "Black Tea", image: "black-tea", description: "레몬 한 조각 띄운 진하고 향긋한 홍차", categories: ["차"], price: 4000, temperatures: ["hot", "ice"] },
  { name: "칡차", nameEn: "Arrowroot Tea", image: "arrowroot-tea", description: "말린 칡뿌리를 오래 달여 구수하고 깊은 맛", categories: ["차"], price: 4500, temperatures: ["hot"] },
  { name: "율무차", nameEn: "Job's Tears Tea", image: "jobs-tears-tea", description: "고소하고 걸쭉한 율무차에 견과를 솔솔 뿌려 드려요", categories: ["차"], price: 4000, temperatures: ["hot"] },
  { name: "산수유", nameEn: "Cornelian Cherry Tea", image: "sansuyu", description: "붉은 산수유 열매를 달여 새콤하고 개운한 차", categories: ["차"], price: 5000, temperatures: ["hot"] },
  { name: "둥굴레차", nameEn: "Solomon's Seal Tea", image: "solomons-seal-tea", description: "볶은 둥굴레를 우려낸 구수하고 편안한 차", categories: ["차"], price: 3500, temperatures: ["hot", "ice"] },
  { name: "유자차", nameEn: "Yuja Tea", image: "yuja-tea", description: "직접 담근 유자청을 듬뿍 넣은 새콤달콤한 유자차", categories: ["차"], price: 4500, recommended: true, temperatures: ["hot", "ice"] },
  { name: "생강차", nameEn: "Ginger Tea", image: "ginger-tea", description: "알싸하고 따뜻한 국산 생강을 우려낸 차", categories: ["차"], price: 4500, temperatures: ["hot"] },
  { name: "들깨차", nameEn: "Perilla Seed Tea", image: "perilla-seed-tea", description: "볶은 들깨를 곱게 갈아 넣은 진하고 고소한 차", categories: ["차"], price: 5000, isNew: true, temperatures: ["hot"] },
  { name: "인삼차", nameEn: "Ginseng Tea", image: "ginseng-tea", description: "쌉싸름한 인삼 향이 그윽한 기운 나는 차", categories: ["차"], price: 5500, temperatures: ["hot"] },
  { name: "칡즙", nameEn: "Arrowroot Juice", image: "arrowroot-juice", description: "쌉싸름한 뒷맛이 개운한 국산 칡즙", categories: ["차"], price: 5000, temperatures: ["ice"] },
  { name: "생칡즙", nameEn: "Fresh Arrowroot Juice", image: "fresh-arrowroot-juice", description: "그날 짜낸 생칡을 그대로 담은 진한 생칡즙", categories: ["차"], price: 6000, available: false, temperatures: ["ice"] },
  { name: "쌍화차", nameEn: "Ssanghwa Tea", image: "ssanghwacha", description: "노른자 동동 띄우고 잣·대추 듬뿍 올린 다방 쌍화차", categories: ["차"], price: 6000, recommended: true, temperatures: ["hot"] },
  { name: "벌꿀차", nameEn: "Honey Tea", image: "honey-tea", description: "토종 벌꿀을 따끈하게 풀어낸 달콤한 꿀차", categories: ["차"], price: 4000, temperatures: ["hot", "ice"] },
  { name: "대추차", nameEn: "Jujube Tea", image: "jujube-tea", description: "대추를 푹 고아 걸쭉하게 내린 달큰한 대추차", categories: ["차"], price: 5500, recommended: true, temperatures: ["hot"] },
  { name: "마차", nameEn: "Yam Tea", image: "yam-tea", description: "곱게 간 마에 우유와 꿀을 더한 부드러운 마차", categories: ["차"], price: 5000, isNew: true, temperatures: ["hot", "ice"] },
  { name: "쑥차", nameEn: "Mugwort Tea", image: "mugwort-tea", description: "봄 쑥을 덖어 우린 향긋하고 쌉쌀한 쑥차", categories: ["차"], price: 4000, temperatures: ["hot"] },
  { name: "은행차", nameEn: "Ginkgo Nut Tea", image: "ginkgo-tea", description: "구운 은행을 띄운 고소하고 따뜻한 은행차", categories: ["차"], price: 5000, temperatures: ["hot"] },
  { name: "코코아", nameEn: "Hot Cocoa", image: "cocoa", description: "진한 코코아에 우유를 듬뿍 넣은 달콤한 한 잔", categories: ["차"], price: 4000, temperatures: ["hot", "ice"] },
  { name: "우유", nameEn: "Milk", image: "milk", description: "고소한 생우유 한 잔, 따뜻하게도 시원하게도", categories: ["쥬스"], price: 3000, temperatures: ["hot", "ice"] },
  { name: "감식초", nameEn: "Persimmon Vinegar Drink", image: "persimmon-vinegar", description: "오래 숙성한 감식초를 시원하게 타낸 새콤한 음료", categories: ["쥬스"], price: 4500, isNew: true, temperatures: ["ice"] },
  { name: "오렌지 쥬스", nameEn: "Orange Juice", image: "orange-juice", description: "유리잔에 얼음 동동, 새콤달콤 오렌지 쥬스", categories: ["쥬스"], price: 4500, temperatures: ["ice"] },
  { name: "매실 쥬스", nameEn: "Green Plum Juice", image: "maesil-juice", description: "직접 담근 매실청으로 만든 상큼한 매실 쥬스", categories: ["쥬스"], price: 4500, recommended: true, temperatures: ["ice"] },
  { name: "토마토 쥬스", nameEn: "Tomato Juice", image: "tomato-juice", description: "잘 익은 토마토를 통째로 갈아낸 건강한 쥬스", categories: ["쥬스"], price: 4500, temperatures: ["ice"] },
  { name: "딸기 쥬스", nameEn: "Strawberry Juice", image: "strawberry-juice", description: "생딸기를 듬뿍 갈아 넣은 달콤한 딸기 쥬스", categories: ["쥬스"], price: 5000, isNew: true, temperatures: ["ice"] },
  { name: "모나카", nameEn: "Monaka", image: "monaka", description: "바삭한 찹쌀 과자 속에 달콤한 팥앙금을 채운 모나카", categories: ["다과"], price: 3000, temperatures: [] },
  { name: "카스테라", nameEn: "Castella", image: "castella", description: "촉촉하고 폭신한 옛날 카스테라 한 조각", categories: ["다과"], price: 4000, recommended: true, temperatures: [] },
  { name: "계란 후라이", nameEn: "Fried Egg", image: "fried-egg", description: "노른자를 살짝 익힌 반숙 계란 후라이, 모닝커피와 함께", categories: ["다과"], price: 2000, temperatures: [] },
  { name: "깨죽", nameEn: "Sesame Porridge", image: "sesame-porridge", description: "검은깨를 곱게 갈아 쑨 고소한 깨죽", categories: ["다과"], price: 5500, temperatures: ["hot"] },
  { name: "모닝커피 세트", nameEn: "Morning Coffee Set", image: "set-morning", description: "커피 + 계란 후라이. 다방의 아침을 여는 단골 조합", categories: ["세트"], price: 5000, recommended: true, temperatures: ["hot", "ice"] },
  { name: "쌍화차 세트", nameEn: "Ssanghwa Tea Set", image: "set-ssanghwa", description: "쌍화차 + 모나카. 진한 쌍화차에 달콤한 모나카 한 입", categories: ["세트"], price: 8500, temperatures: ["hot"] },
  { name: "대추차 세트", nameEn: "Jujube Tea Set", image: "set-jujube", description: "대추차 + 카스테라. 달큰한 대추차와 폭신한 카스테라", categories: ["세트"], price: 9000, isNew: true, temperatures: ["hot"] },
  { name: "유자차 세트", nameEn: "Yuja Tea Set", image: "set-yuja", description: "유자차 + 깨죽. 든든한 깨죽 한 그릇에 상큼한 유자차", categories: ["세트"], price: 9500, temperatures: ["hot", "ice"] },
  { name: "딸기 쥬스 세트", nameEn: "Strawberry Juice Set", image: "set-strawberry", description: "딸기 쥬스 + 카스테라. 달콤한 오후의 간식 한 상", categories: ["세트"], price: 8500, temperatures: ["ice"] },
  { name: "든든 보양 세트", nameEn: "Hearty Boyang Set", image: "set-boyang", description: "계란 후라이 + 깨죽 + 쌍화탕. 속을 든든히 채우는 보양 한 상", categories: ["세트"], price: 9500, isNew: true, temperatures: ["hot"] },
];

// 예전 시드로 만들어진 로컬 데이터의 SVG 경로를 같은 이름의 JPG로 바꿔 보여준다
function rasterImageUrl(imageUrl: string): string {
  const match = /^\/images\/menus\/([a-z-]+)\.svg$/.exec(imageUrl);
  return match && rasterMenuImages.has(match[1]) ? `/images/menus/${match[1]}.jpg` : imageUrl;
}

function menus(): Menu[] {
  const stored = readMockData<Menu[]>(fileName, () => {
    const now = Date.now();
    return seedMenus.map(({ image, available = true, isNew = false, recommended = false, ...menu }, index) => {
      const createdAt = new Date(now - (isNew ? 0 : (index + 1) * 60_000)).toISOString();
      const extension = rasterMenuImages.has(image) ? "jpg" : "svg";
      return { ...menu, id: randomUUID(), imageUrl: `/images/menus/${image}.${extension}`, available, isNew, recommended, createdAt, updatedAt: createdAt };
    });
  });
  // Older local mock records predate these fields; keep them readable.
  return stored.map((menu) => {
    const legacy = legacySeedFields[menu.name];
    const legacyCategory = (menu as unknown as { category?: string }).category;
    return {
      ...menu,
      nameEn: menu.nameEn ?? legacy?.nameEn ?? "",
      imageUrl: rasterImageUrl(menu.imageUrl ?? legacy?.imageUrl ?? MENU_IMAGE_PLACEHOLDER),
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
