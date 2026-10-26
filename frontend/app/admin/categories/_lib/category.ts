export const CATEGORY_NAME_MAX_LENGTH = 40;

export type CategoryResponse = {
  id: number;
  name: string;
  displayOrder: number;
  isFallback: boolean;
  menuCount: number;
  createdAt: string;
  updatedAt: string;
};

export const isCategoryId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
