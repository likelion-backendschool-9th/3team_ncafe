"use client";

import { useState, type DragEvent } from "react";
import type { Category } from "@/app/_lib/mock/categories";
import { moveCategory, reorderCategories } from "../_actions";
import { CategoryRow } from "./CategoryRow";
import styles from "../categories.module.css";

export function CategoryList({ categories, menuCounts }: {
  categories: Category[];
  menuCounts: Record<string, number>;
}) {
  const [order, setOrder] = useState(categories);
  const [syncedCategories, setSyncedCategories] = useState(categories);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // 추가/삭제/이름수정 등 서버에서 새로 내려온 목록으로 동기화 (렌더 중 동기화, effect 대신)
  if (categories !== syncedCategories) {
    setSyncedCategories(categories);
    setOrder(categories);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = [...order];
    const fromIndex = next.findIndex((category) => category.id === dragId);
    const toIndex = next.findIndex((category) => category.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrder(next);
    setDragId(null);
    setOverId(null);
    void reorderCategories(next.map((category) => category.id));
  }

  function handleMove(id: string, direction: "up" | "down") {
    const index = order.findIndex((category) => category.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    void moveCategory(id, direction);
  }

  return (
    <div className={styles.list}>
      {order.map((category, index) => (
        <div
          key={category.id}
          draggable
          onDragStart={() => setDragId(category.id)}
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (overId !== category.id) setOverId(category.id);
          }}
          onDragLeave={() => setOverId((current) => (current === category.id ? null : current))}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            handleDrop(category.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          className={overId === category.id && dragId && dragId !== category.id ? styles.rowDragOver : undefined}
        >
          <CategoryRow
            category={category}
            menuCount={menuCounts[category.name] ?? 0}
            isFirst={index === 0}
            isLast={index === order.length - 1}
            onMoveUp={() => handleMove(category.id, "up")}
            onMoveDown={() => handleMove(category.id, "down")}
          />
        </div>
      ))}
    </div>
  );
}
