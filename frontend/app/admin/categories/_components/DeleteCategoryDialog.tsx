"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteCategory } from "../_actions";
import styles from "../categories.module.css";

// 행이 draggable 안에 있어 모달 안 드래그가 행 순서 변경으로 번지지 않도록 body에 띄운다.
export function DeleteCategoryDialog({ categoryId, categoryName, onClose }: {
  categoryId: number;
  categoryName: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // 실수로 지우지 않게 취소 버튼에 먼저 포커스를 둔다.
    cancelRef.current?.focus();
    return () => dialog.close();
  }, []);

  // 실패한 뒤 닫으면 다른 창의 변경(이미 삭제됨 등)을 반영하도록 목록을 새로 받는다.
  function handleClose() {
    if (error) router.refresh();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !pending) handleClose();
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (result.error) setError(result.error);
    });
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`delete-${categoryId}-title`}
      aria-describedby={`delete-${categoryId}-message`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) handleClose();
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.dialogPanel}>
        <div className={styles.dialogHeader}>
          <h2 id={`delete-${categoryId}-title`}>{categoryName} 삭제</h2>
          <button type="button" className={styles.dialogClose} onClick={handleClose} disabled={pending} aria-label="닫기">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <p id={`delete-${categoryId}-message`} className={styles.dialogMessage}>카테고리를 삭제 하시겠습니까?</p>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.outlineButton} onClick={handleClose} disabled={pending}>취소</button>
          <button type="button" className={styles.primaryButton} onClick={handleConfirm} disabled={pending}>{pending ? "삭제 중..." : "삭제"}</button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
