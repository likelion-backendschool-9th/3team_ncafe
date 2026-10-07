"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MenuFormState } from "../_actions";
import { MENU_CATEGORIES } from "../_lib/menuCategories";
import styles from "../menus.module.css";

type MenuAction = (state: MenuFormState, data: FormData) => Promise<MenuFormState>;

export function MenuForm({ action, initialState, cancelHref, submitLabel }: {
  action: MenuAction;
  initialState: MenuFormState;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const hasLegacyCategory = state.values.category && !MENU_CATEGORIES.some((category) => category === state.values.category);

  return (
    <form action={formAction} className={styles.menuForm}>
      {state.message && <p className="form-error" role="alert">{state.message}</p>}
      <div className={styles.formFields}>
        <div className={styles.formField}>
          <label htmlFor="name">메뉴명 (한글)</label>
          <input id="name" name="name" type="text" maxLength={80} required defaultValue={state.values.name} aria-invalid={!!state.errors.name} aria-describedby={state.errors.name ? "name-error" : undefined} />
          {state.errors.name && <span id="name-error" className={styles.fieldError}>{state.errors.name}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="nameEn">메뉴명 (영어)</label>
          <input id="nameEn" name="nameEn" type="text" maxLength={80} required defaultValue={state.values.nameEn} aria-invalid={!!state.errors.nameEn} aria-describedby={state.errors.nameEn ? "nameEn-error" : undefined} />
          {state.errors.nameEn && <span id="nameEn-error" className={styles.fieldError}>{state.errors.nameEn}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="imageUrl">이미지 주소 (선택)</label>
          <input id="imageUrl" name="imageUrl" type="text" inputMode="url" maxLength={2048} defaultValue={state.values.imageUrl} placeholder="https://... 또는 /images/menus/..." aria-invalid={!!state.errors.imageUrl} aria-describedby={state.errors.imageUrl ? "imageUrl-error imageUrl-hint" : "imageUrl-hint"} />
          <span id="imageUrl-hint" className={styles.fieldHint}>비워두면 기본 이미지가 표시됩니다.</span>
          {state.errors.imageUrl && <span id="imageUrl-error" className={styles.fieldError}>{state.errors.imageUrl}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="category">카테고리</label>
          <select id="category" name="category" required defaultValue={state.values.category} aria-invalid={!!state.errors.category} aria-describedby={state.errors.category ? "category-error" : undefined}>
            <option value="" disabled>카테고리를 선택해 주세요</option>
            {hasLegacyCategory && <option value={state.values.category}>{state.values.category} (기존 분류)</option>}
            {MENU_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          {state.errors.category && <span id="category-error" className={styles.fieldError}>{state.errors.category}</span>}
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
        <div className={styles.checkboxFields}>
          <label><input name="isNew" type="checkbox" defaultChecked={state.values.isNew === "true"} /> NEW 메뉴</label>
          <label><input name="recommended" type="checkbox" defaultChecked={state.values.recommended === "true"} /> 추천 메뉴</label>
        </div>
      </div>
      <div className={styles.formActions}>
        <button className="button" type="submit" disabled={pending}>{pending ? "저장 중..." : submitLabel}</button>
        <Link href={cancelHref}>취소</Link>
      </div>
    </form>
  );
}
