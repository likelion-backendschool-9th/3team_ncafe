"use client";

import type { DragEvent } from "react";
import { useCategoryOrder } from "../_hooks/useCategoryOrder";
import type { CategoryResponse } from "../_lib/category";
import { CategoryRow } from "./CategoryRow";
import styles from "../categories.module.css";

type Props = { categories: CategoryResponse[] };

export function CategoryList({ categories }: Props) {
  const { order, error, dragId, overId, startDrag, dragOver, dragLeave, drop, clearDrag, move } = useCategoryOrder(categories);

  return (
    <>
      <p className={styles.fieldError} role="alert">{error}</p>
      <div className={styles.list}>
        {order.map((category, index) => (
          <div
            key={category.id}
            draggable
            onDragStart={() => startDrag(category.id)}
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
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
              isFirst={index === 0}
              isLast={index === order.length - 1}
              onMoveUp={() => move(category.id, "up")}
              onMoveDown={() => move(category.id, "down")}
            />
          </div>
        ))}
      </div>
    </>
  );
}
