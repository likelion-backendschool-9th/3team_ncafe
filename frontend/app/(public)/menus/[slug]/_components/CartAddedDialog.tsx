"use client";

import { useEffect, useRef } from "react";
import styles from "../../menus.module.css";

type CartAddedDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CartAddedDialog({
  open,
  onClose,
  onConfirm,
  onCancel,
}: CartAddedDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // showModal()로 열어야 배경 차단, 포커스 가두기, Esc 닫기가 브라우저 기본으로 동작한다
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.cartDialog}
      aria-labelledby="cart-dialog-question"
      aria-describedby="cart-dialog-status"
      onClose={onClose}
    >
      <div className={styles.cartDialogBody}>
        <button
          type="button"
          className={styles.cartDialogClose}
          aria-label="닫기"
          onClick={onClose}
        >
          ×
        </button>
        <p className={styles.cartDialogStatus} id="cart-dialog-status">
          <span aria-hidden="true">✓</span> 장바구니에 메뉴를 담았습니다
        </p>
        <h2 className={styles.cartDialogQuestion} id="cart-dialog-question">
          장바구니로 이동하시겠습니까?
        </h2>
        <div className={styles.cartDialogActions}>
          <button
            type="button"
            className={styles.cartDialogButton}
            onClick={onCancel}
          >
            아니요
          </button>
          <button
            type="button"
            className={`${styles.cartDialogButton} ${styles.cartDialogButtonPrimary}`}
            onClick={onConfirm}
          >
            예
          </button>
        </div>
      </div>
    </dialog>
  );
}
