"use client";

import { useEffect, useId, useRef } from "react";
import controls from "./order-controls.module.css";

type Props = { open: boolean; orderCode: string; pending: boolean; error?: string;
  action: (formData: FormData) => void; onClose: () => void };
export function ConfirmCancelDialog({ open, orderCode, pending, error, action, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => { if (open && error) errorRef.current?.focus(); }, [open, error]);

  return <dialog ref={dialog} className={controls.dialog} aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-description`} onClose={onClose}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first) event.preventDefault();
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { if (pending) event.preventDefault(); else onClose(); }}
    onClick={event => { if (!pending && event.target === event.currentTarget) onClose(); }}>
    <form action={action} className={controls.dialogPanel} aria-busy={pending}>
      <input type="hidden" name="nextStatus" value="canceled" />
      <div className={controls.dialogHeader}><h2 id={`${id}-title`}>주문 {orderCode} 취소</h2></div>
      <p id={`${id}-description`}>이 주문을 취소하시겠습니까? 취소한 주문은 되돌릴 수 없습니다.</p>
      {error && <p ref={errorRef} tabIndex={-1} className={controls.fieldError} role="alert">{error}</p>}
      <div className={controls.dialogActions}>
        <button type="button" className={controls.button} disabled={pending} autoFocus onClick={onClose}>닫기</button>
        <button type="submit" className={`${controls.button} ${controls.dangerButton}`} disabled={pending}>
          {pending ? "취소 중…" : "주문 취소 확인"}
        </button>
      </div>
    </form>
  </dialog>;
}
