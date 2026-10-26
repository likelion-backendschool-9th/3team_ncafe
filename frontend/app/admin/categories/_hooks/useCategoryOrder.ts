import { useState, useTransition } from "react";
import { reorderCategories } from "../_actions";
import type { CategoryResponse } from "@/app/admin/_lib/categories/category";

// 기타 카테고리는 항상 맨 아래에 둔다. 백엔드도 기타가 마지막이 아닌 순서는 거절한다.
function withFallbackLast(categories: CategoryResponse[]) {
  return [...categories.filter((category) => !category.isFallback), ...categories.filter((category) => category.isFallback)];
}

// 화면 순서를 먼저 바꾸고 저장한다. 실패하면 서버가 다시 내려준 목록으로 되돌아간다.
export function useCategoryOrder(categories: CategoryResponse[]) {
  const [order, setOrder] = useState(() => withFallbackLast(categories));
  const [syncedCategories, setSyncedCategories] = useState(categories);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  // 추가/삭제/이름수정 등 서버에서 새로 내려온 목록으로 동기화 (렌더 중 동기화, effect 대신)
  if (categories !== syncedCategories) {
    setSyncedCategories(categories);
    setOrder(withFallbackLast(categories));
  }

  const movable = order.filter((category) => !category.isFallback);

  // 옮길 수 있는 목록만 받아 기타를 끝에 붙여 저장한다.
  function save(nextMovable: CategoryResponse[]) {
    const next = [...nextMovable, ...order.filter((category) => category.isFallback)];
    setOrder(next);
    setError(undefined);
    startTransition(async () => {
      const result = await reorderCategories(next.map((category) => category.id));
      setError(result.error);
    });
  }

  function clearDrag() {
    setDragId(null);
    setOverId(null);
  }

  function drop(targetId: number) {
    const fromIndex = movable.findIndex((category) => category.id === dragId);
    const toIndex = movable.findIndex((category) => category.id === targetId);
    clearDrag();
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const next = [...movable];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    save(next);
  }

  function move(id: number, direction: "up" | "down") {
    const index = movable.findIndex((category) => category.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= movable.length) return;
    const next = [...movable];
    [next[index], next[target]] = [next[target], next[index]];
    save(next);
  }

  function dragOver(id: number) {
    if (overId !== id) setOverId(id);
  }

  function dragLeave(id: number) {
    setOverId((current) => (current === id ? null : current));
  }

  return { order, movableCount: movable.length, error, dragId, overId, startDrag: setDragId, dragOver, dragLeave, drop, clearDrag, move };
}
