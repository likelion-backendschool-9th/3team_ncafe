"use client";

import type { DragEvent } from "react";
import { useCategoryOrder } from "../_hooks/useCategoryOrder";
import type { CategoryResponse } from "../_lib/category";
import { CategoryRow } from "./CategoryRow";
import styles from "../categories.module.css";

type Props = { categories: CategoryResponse[] };

export function CategoryList({ categories }: Props) {
  const { order, movableCount, error, dragId, overId, startDrag, dragOver, dragLeave, drop, clearDrag, move } = useCategoryOrder(categories);

  return (
    <>
      <p className={styles.fieldError} role="alert">{error}</p>
      <div className={styles.list}>
        {order.map((category, index) => (
          <div
            key={category.id}
            draggable={!category.isFallback}
            onDragStart={() => startDrag(category.id)}
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              // 기타 행 위로는 놓을 수 없게 기본 동작(drop 거부)을 그대로 둔다.
              if (category.isFallback) return;
              event.preventDefault();
              dragOver(category.id);
            }}
            onDragLeave={() => dragLeave(category.id)}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              drop(category.id);
            }}
            onDragEnd={clearDrag}
            className={overId === category.id && dragId && dragId !== category.id ? styles.rowDragOver : undefined}
          >
            <CategoryRow
              category={category}
              position={index + 1}
              canMoveUp={!category.isFallback && index > 0}
              canMoveDown={index < movableCount - 1}
              onMoveUp={() => move(category.id, "up")}
              onMoveDown={() => move(category.id, "down")}
            />
          </div>
        ))}
      </div>
    </>
  );
}
