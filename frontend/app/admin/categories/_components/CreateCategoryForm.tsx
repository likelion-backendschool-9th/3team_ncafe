"use client";

import { useActionState } from "react";
import { createCategory, type CategoryFormState } from "../_actions";
import styles from "../categories.module.css";

const initialState: CategoryFormState = {};

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);

  return (
    <form action={formAction} className={styles.createForm}>
      <div className={styles.field}>
        <label htmlFor="new-category-name">새 카테고리명</label>
        <input id="new-category-name" name="name" type="text" maxLength={40} required aria-invalid={!!state.error} aria-describedby={state.error ? "new-category-error" : undefined} />
      </div>
      <button className="button" type="submit" disabled={pending}>{pending ? "추가 중..." : "카테고리 추가"}</button>
      {state.error && <span id="new-category-error" className={styles.fieldError}>{state.error}</span>}
    </form>
  );
}
