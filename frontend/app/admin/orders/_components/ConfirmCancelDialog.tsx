"use client";

import { useEffect, useId, useRef } from "react";
import { MAX_CANCEL_REASON_LENGTH } from "../_lib/types";
import controls from "./order-controls.module.css";

type Props = { open: boolean; orderCode: string; pending: boolean; error?: string; reason: string; onReasonChange: (reason: string) => void;
  action: (formData: FormData) => void; onClose: () => void };
export function ConfirmCancelDialog({ open, orderCode, pending, error, reason, onReasonChange, action, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => { if (open && error && !pending) reasonRef.current?.focus(); }, [open, error, pending]);

  return <dialog ref={dialog} className={controls.dialog} aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-description`} onClose={onClose}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const fields = event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>("textarea:not(:disabled), button:not(:disabled)");
      const first = fields[0];
      const last = fields[fields.length - 1];
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
      <label className={controls.field} htmlFor={`${id}-reason`}>취소 사유 (필수)</label>
      <textarea ref={reasonRef} id={`${id}-reason`} name="cancelReason" className={controls.textarea}
        value={reason} onChange={event => onReasonChange(event.target.value)} required maxLength={MAX_CANCEL_REASON_LENGTH}
        disabled={pending} autoFocus aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint ${id}-count${error ? ` ${id}-error` : ""}`} />
      <p className={controls.fieldHint} id={`${id}-hint`}>고객에게 전달되는 사유입니다. 200자 이내로 입력해 주세요.</p>
      <p className={controls.fieldHint} id={`${id}-count`}>{reason.length} / {MAX_CANCEL_REASON_LENGTH}자</p>
      {error && <p id={`${id}-error`} className={controls.fieldError} role="alert">{error}</p>}
      <div className={controls.dialogActions}>
        <button type="button" className={controls.button} disabled={pending} onClick={onClose}>닫기</button>
        <button type="submit" className={`${controls.button} ${controls.dangerButton}`} disabled={pending}>
          {pending ? "취소 중…" : "주문 취소 확인"}
        </button>
      </div>
    </form>
  </dialog>;
}
