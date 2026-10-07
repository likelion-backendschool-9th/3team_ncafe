"use client";

import { useActionState, type FormEvent } from "react";
import type { Category } from "@/app/_lib/mock/categories";
import { deleteCategory, renameCategory, type CategoryFormState } from "../_actions";
import styles from "../categories.module.css";

const initialState: CategoryFormState = {};

export function CategoryRow({ category, menuCount, isFirst, isLast, onMoveUp, onMoveDown }: {
  category: Category;
  menuCount: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const boundRename = renameCategory.bind(null, category.id);
  const [state, formAction, pending] = useActionState(boundRename, initialState);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (menuCount > 0) {
      if (!window.confirm(`'${category.name}' 카테고리를 쓰는 메뉴가 ${menuCount}개 있습니다. 그래도 삭제할까요?`)) {
        event.preventDefault();
      }
      return;
    }
    if (!window.confirm(`'${category.name}' 카테고리를 삭제할까요?`)) event.preventDefault();
  }

  return (
    <div className={styles.row}>
      <span className={styles.dragHandle} aria-hidden="true" title="드래그해서 순서 변경">⠿</span>
      <div className={styles.orderButtons}>
        <button type="button" className={styles.orderButton} onClick={onMoveUp} disabled={isFirst} aria-label={`${category.name} 위로 이동`}>▲</button>
        <button type="button" className={styles.orderButton} onClick={onMoveDown} disabled={isLast} aria-label={`${category.name} 아래로 이동`}>▼</button>
      </div>
      <form action={formAction} className={styles.rowForm}>
        <input name="name" type="text" maxLength={40} required defaultValue={category.name} aria-invalid={!!state.error} aria-describedby={state.error ? `category-${category.id}-error` : undefined} />
        <button className={styles.saveButton} type="submit" disabled={pending}>{pending ? "수정 중..." : "수정"}</button>
      </form>
      <form action={deleteCategory.bind(null, category.id)} onSubmit={confirmDelete}>
        <button className={styles.deleteButton} type="submit">삭제</button>
      </form>
      <span className={styles.meta}>메뉴 {menuCount}개에서 사용 중</span>
      {state.error && <span id={`category-${category.id}-error`} className={styles.fieldError}>{state.error}</span>}
    </div>
  );
}
