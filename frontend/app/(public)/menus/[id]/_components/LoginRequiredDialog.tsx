"use client";

import { useEffect, useRef } from "react";
import styles from "../../menus.module.css";

type LoginRequiredDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LoginRequiredDialog({
  open,
  onClose,
  onConfirm,
}: LoginRequiredDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.cartDialog}
      aria-labelledby="login-dialog-question"
      aria-describedby="login-dialog-status"
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
        <p className={styles.cartDialogStatus} id="login-dialog-status">
          로그인이 필요한 서비스입니다
        </p>
        <h2 className={styles.cartDialogQuestion} id="login-dialog-question">
          로그인 하시겠습니까?
        </h2>
        <div className={styles.cartDialogActions}>
          <button
            type="button"
            className={styles.cartDialogButton}
            onClick={onClose}
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
