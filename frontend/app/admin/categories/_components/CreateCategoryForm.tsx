"use client";

import { useActionState } from "react";
import { createCategory, type CategoryFormState } from "../_actions";
import styles from "../categories.module.css";

const initialState: CategoryFormState = {};

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);

  return (
    <form action={formAction} className={styles.createForm}>
      <label htmlFor="new-category-name">새 카테고리명</label>
      <div className={styles.createRow}>
        <input id="new-category-name" className={styles.input} name="name" type="text" maxLength={40} required defaultValue={state.values?.name} placeholder="예: 커피, 라떼, 디저트" aria-invalid={!!state.error} aria-describedby={state.error ? "new-category-error" : undefined} />
        <button className={styles.primaryButton} type="submit" disabled={pending}>{pending ? "추가 중..." : "카테고리 추가"}</button>
      </div>
      {state.error && <span id="new-category-error" className={styles.fieldError}>{state.error}</span>}
    </form>
  );
}
