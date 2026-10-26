// 백엔드 dto/menus의 MenuResponse·MenuPageResponse·MenuCategoryResponse와 이름·타입을 맞춘다.
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

export type MenuPageResponse = {
  items: MenuResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type MenuCategoryResponse = {
  id: number;
  name: string;
};
