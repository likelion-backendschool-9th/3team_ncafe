"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MenuFormState } from "../_actions";
import styles from "../menus.module.css";

type MenuAction = (state: MenuFormState, data: FormData) => Promise<MenuFormState>;

export function MenuForm({ action, initialState, cancelHref, submitLabel }: {
  action: MenuAction;
  initialState: MenuFormState;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.menuForm}>
      {state.message && <p className="form-error" role="alert">{state.message}</p>}
      <div className={styles.formFields}>
        <div className={styles.formField}>
          <label htmlFor="name">메뉴명</label>
          <input id="name" name="name" type="text" maxLength={80} required defaultValue={state.values.name} aria-invalid={!!state.errors.name} aria-describedby={state.errors.name ? "name-error" : undefined} />
          {state.errors.name && <span id="name-error" className={styles.fieldError}>{state.errors.name}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="description">설명</label>
          <textarea id="description" name="description" maxLength={500} required rows={4} defaultValue={state.values.description} aria-invalid={!!state.errors.description} aria-describedby={state.errors.description ? "description-error" : undefined} />
          {state.errors.description && <span id="description-error" className={styles.fieldError}>{state.errors.description}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="price">가격 (원)</label>
          <input id="price" name="price" type="number" min={1} step={1} required defaultValue={state.values.price} aria-invalid={!!state.errors.price} aria-describedby={state.errors.price ? "price-error" : undefined} />
          {state.errors.price && <span id="price-error" className={styles.fieldError}>{state.errors.price}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="available">판매 상태</label>
          <select id="available" name="available" defaultValue={state.values.available} aria-invalid={!!state.errors.available} aria-describedby={state.errors.available ? "available-error" : undefined}>
            <option value="true">판매 중</option>
            <option value="false">판매 중지</option>
          </select>
          {state.errors.available && <span id="available-error" className={styles.fieldError}>{state.errors.available}</span>}
        </div>
      </div>
      <div className={styles.formActions}>
        <button className="button" type="submit" disabled={pending}>{pending ? "저장 중..." : submitLabel}</button>
        <Link href={cancelHref}>취소</Link>
      </div>
    </form>
  );
}
