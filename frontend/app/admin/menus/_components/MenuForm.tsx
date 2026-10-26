"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MenuFormState } from "../_actions";
import { MENU_DESCRIPTION_MAX_LENGTH, MENU_IMAGE_URL_MAX_LENGTH, MENU_NAME_MAX_LENGTH, MENU_PRICE_MAX, MENU_PRICE_MIN, MENU_SLUG_MAX_LENGTH } from "../_lib/menu";
import styles from "../menus.module.css";

type MenuAction = (state: MenuFormState, data: FormData) => Promise<MenuFormState>;
type CategoryOption = { id: number; name: string };

// 오류가 있으면 입력란과 오류 문구를 연결한다.
function describedBy(error: string | undefined, id: string, hint?: string) {
  return [error ? `${id}-error` : "", hint ?? ""].filter(Boolean).join(" ") || undefined;
}

export function MenuForm({ action, initialState, cancelHref, submitLabel, categoryOptions, slugReadOnly = false }: {
  action: MenuAction;
  initialState: MenuFormState;
  cancelHref: string;
  submitLabel: string;
  categoryOptions: CategoryOption[];
  slugReadOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const { values, errors } = state;

  return (
    <form action={formAction} className={styles.menuForm}>
      {state.message && <p className="form-error" role="alert">{state.message}</p>}
      <div className={styles.formFields}>
        <div className={styles.formField}>
          <label htmlFor="slug">slug</label>
          <input id="slug" name="slug" type="text" maxLength={MENU_SLUG_MAX_LENGTH} required={!slugReadOnly} readOnly={slugReadOnly} defaultValue={values.slug} placeholder="americano" aria-invalid={!!errors.slug} aria-describedby={describedBy(errors.slug, "slug", "slug-hint")} />
          <span id="slug-hint" className={styles.fieldHint}>{slugReadOnly ? "slug는 등록 후 바꿀 수 없습니다." : "메뉴 주소에 쓰입니다. 소문자·숫자·하이픈만 사용할 수 있습니다."}</span>
          {errors.slug && <span id="slug-error" className={styles.fieldError}>{errors.slug}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="name">메뉴명</label>
          <input id="name" name="name" type="text" maxLength={MENU_NAME_MAX_LENGTH} required defaultValue={values.name} aria-invalid={!!errors.name} aria-describedby={describedBy(errors.name, "name")} />
          {errors.name && <span id="name-error" className={styles.fieldError}>{errors.name}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="imageUrl">이미지 주소</label>
          <input id="imageUrl" name="imageUrl" type="text" inputMode="url" maxLength={MENU_IMAGE_URL_MAX_LENGTH} defaultValue={values.imageUrl} placeholder="https://... 또는 /images/menus/..." aria-invalid={!!errors.imageUrl} aria-describedby={describedBy(errors.imageUrl, "imageUrl", "imageUrl-hint")} />
          <span id="imageUrl-hint" className={styles.fieldHint}>비워두면 기본 이미지가 표시됩니다.</span>
          {errors.imageUrl && <span id="imageUrl-error" className={styles.fieldError}>{errors.imageUrl}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="categoryId">카테고리</label>
          <select id="categoryId" name="categoryId" required defaultValue={values.categoryId} aria-invalid={!!errors.categoryId} aria-describedby={describedBy(errors.categoryId, "categoryId", "categoryId-hint")}>
            <option value="" disabled>카테고리 선택</option>
            {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <span id="categoryId-hint" className={styles.fieldHint}>카테고리 관리에서 추가·삭제할 수 있습니다.</span>
          {errors.categoryId && <span id="categoryId-error" className={styles.fieldError}>{errors.categoryId}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="description">설명</label>
          <textarea id="description" name="description" maxLength={MENU_DESCRIPTION_MAX_LENGTH} required rows={4} defaultValue={values.description} aria-invalid={!!errors.description} aria-describedby={describedBy(errors.description, "description")} />
          {errors.description && <span id="description-error" className={styles.fieldError}>{errors.description}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="price">가격 (원)</label>
          <input id="price" name="price" type="number" min={MENU_PRICE_MIN} max={MENU_PRICE_MAX} step={1} required defaultValue={values.price} aria-invalid={!!errors.price} aria-describedby={describedBy(errors.price, "price")} />
          {errors.price && <span id="price-error" className={styles.fieldError}>{errors.price}</span>}
        </div>
        <div className={styles.formField}>
          <label htmlFor="available">판매 상태</label>
          <select id="available" name="available" defaultValue={values.available} aria-invalid={!!errors.available} aria-describedby={describedBy(errors.available, "available")}>
            <option value="true">판매 중</option>
            <option value="false">판매 중지</option>
          </select>
          {errors.available && <span id="available-error" className={styles.fieldError}>{errors.available}</span>}
        </div>
        <div className={styles.formField}>
          <span id="temperature-label">온도</span>
          <div className={styles.checkboxFields} role="group" aria-labelledby="temperature-label" aria-describedby="temperature-hint">
            <label><input name="supportsHot" type="checkbox" defaultChecked={values.supportsHot === "true"} /> 핫</label>
            <label><input name="supportsIced" type="checkbox" defaultChecked={values.supportsIced === "true"} /> 아이스</label>
          </div>
          <span id="temperature-hint" className={styles.fieldHint}>둘 다 끄면 온도 구분 없는 메뉴입니다.</span>
        </div>
        <div className={styles.checkboxFields}>
          <label><input name="isNew" type="checkbox" defaultChecked={values.isNew === "true"} /> 첫 개시</label>
          <label><input name="recommended" type="checkbox" defaultChecked={values.recommended === "true"} /> 추천 메뉴</label>
        </div>
      </div>
      <div className={styles.formActions}>
        <button className="button" type="submit" disabled={pending}>{pending ? "저장 중..." : submitLabel}</button>
        <Link href={cancelHref}>취소</Link>
      </div>
    </form>
  );
}
