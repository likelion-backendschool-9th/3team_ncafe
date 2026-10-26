"use client";

import { useActionState, useRef, useState, type KeyboardEvent } from "react";
import { renameCategory, type CategoryFormState } from "../_actions";
import type { CategoryResponse } from "../_lib/category";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import styles from "../categories.module.css";

const initialState: CategoryFormState = {};

export function CategoryRow({ category, position, isFirst, isLast, onMoveUp, onMoveDown }: {
  category: CategoryResponse;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [state, formAction, pending] = useActionState(async (previous: CategoryFormState, formData: FormData) => {
    const result = await renameCategory(category.id, previous, formData);
    if (!result.error) setEditing(false);
    return result;
  }, initialState);
  const error = editing ? state.error : undefined;
  // 삭제된 카테고리의 메뉴가 옮겨 가는 기타 카테고리는 수정·삭제를 막는다.
  const locked = category.isFallback;
  const lockedHint = "삭제된 카테고리의 메뉴가 옮겨 가는 기타 카테고리라 수정·삭제할 수 없어요.";

  function startEditing() {
    setEditing(true);
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  // Esc로 수정을 취소하면 입력값을 원래 이름으로 되돌린다.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape" || !editing) return;
    event.currentTarget.value = category.name;
    setEditing(false);
  }

  return (
    <div className={styles.row}>
      <span className={styles.dragHandle} aria-hidden="true" title="드래그해서 순서 변경">⠿</span>
      <div className={styles.orderButtons}>
        <button type="button" className={styles.orderButton} onClick={onMoveUp} disabled={isFirst} aria-label={`${category.name} 위로 이동`}>▲</button>
        <button type="button" className={styles.orderButton} onClick={onMoveDown} disabled={isLast} aria-label={`${category.name} 아래로 이동`}>▼</button>
      </div>
      <span className={styles.number} aria-hidden="true">{String(position).padStart(2, "0")}</span>
      <form action={formAction} className={styles.rowForm}>
        <input
          ref={inputRef}
          className={styles.input}
          name="name"
          type="text"
          maxLength={40}
          required
          readOnly={!editing}
          defaultValue={error ? state.values?.name : category.name}
          onKeyDown={handleKeyDown}
          aria-label={`${category.name} 카테고리명`}
          aria-invalid={!!error}
          aria-describedby={error ? `category-${category.id}-error` : undefined}
        />
        {/* 같은 버튼의 type을 바꾸면 클릭 직후 제출될 수 있어 key로 다른 버튼을 그린다. */}
        {editing ? (
          <button key="save" className={styles.primaryButton} type="submit" disabled={pending}>{pending ? "저장 중" : "저장"}</button>
        ) : (
          <button key="edit" className={styles.outlineButton} type="button" onClick={startEditing} disabled={locked} title={locked ? lockedHint : undefined}>수정</button>
        )}
      </form>
      <div className={styles.deleteCell}>
        <button className={styles.dangerButton} type="button" onClick={() => setDeleting(true)} disabled={locked} title={locked ? lockedHint : undefined}>삭제</button>
      </div>
      <span className={`${styles.usage} ${category.menuCount === 0 ? styles.usageEmpty : ""}`}>메뉴 {category.menuCount}개에서 사용 중</span>
      {error && <span id={`category-${category.id}-error`} className={styles.fieldError}>{error}</span>}
      {deleting && <DeleteCategoryDialog categoryId={category.id} categoryName={category.name} onClose={() => setDeleting(false)} />}
    </div>
  );
}
