"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { MAX_CANCEL_REASON_LENGTH, type OrderStatus } from "@/app/_lib/orders/types";
import controls from "./order-controls.module.css";

type Choice = { value: string; label: string };

function StatusSelect({ id, orderCode, currentLabel, status, choices, onCancelSelect }: {
  id: string;
  orderCode: string;
  currentLabel: string;
  status: OrderStatus;
  choices: Choice[];
  onCancelSelect: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <select
        className={`${controls.select} ${controls.statusSelect}`}
        data-status={status}
        id={id}
        name="nextStatus"
        defaultValue=""
        required
        disabled={pending}
        aria-label={`${orderCode} 주문 상태 변경`}
        onChange={(event) => {
          // 취소는 사유를 받아야 하므로 바로 제출하지 않고 사유 입력 창을 연다.
          if (event.currentTarget.value === "canceled") {
            event.currentTarget.value = "";
            onCancelSelect();
            return;
          }
          event.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="" disabled>{currentLabel}</option>
        {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </select>
      {pending && <span className={controls.pending} role="status">변경 중…</span>}
    </>
  );
}

function CancelSubmitButton({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    // 서버가 오류로 되돌려 보내면 창을 닫아 페이지 상단의 오류 안내가 보이게 한다.
    if (wasPending.current && !pending) onDone();
    wasPending.current = pending;
  }, [pending, onDone]);
  return (
    <button className={`${controls.button} ${controls.dangerButton}`} type="submit" disabled={pending}>
      {pending ? "취소 중…" : "주문 취소"}
    </button>
  );
}

function CancelReasonDialog({ action, orderCode, onClose }: {
  action: (formData: FormData) => Promise<void>;
  orderCode: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const baseId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={controls.dialog}
      aria-labelledby={`${baseId}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <form
        className={controls.dialogPanel}
        action={action}
        onSubmit={(event) => {
          if (!reason.trim()) {
            event.preventDefault();
            setError("취소 사유를 입력해 주세요.");
          }
        }}
      >
        <input type="hidden" name="nextStatus" value="canceled" />
        <div className={controls.dialogHeader}>
          <h2 id={`${baseId}-title`}>{orderCode} 주문 취소</h2>
          <button type="button" className={controls.dialogClose} onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className={controls.field}>
          <label htmlFor={`${baseId}-reason`}>취소 사유</label>
          <p id={`${baseId}-hint`} className={controls.fieldHint}>고객의 주문 내역에 그대로 보여요.</p>
        </div>
        <textarea
          id={`${baseId}-reason`}
          className={controls.textarea}
          name="cancelReason"
          value={reason}
          onChange={(event) => {
            setReason(event.currentTarget.value);
            if (error) setError("");
          }}
          maxLength={MAX_CANCEL_REASON_LENGTH}
          rows={4}
          required
          autoFocus
          placeholder="예) 재료 소진으로 준비할 수 없습니다."
          aria-invalid={error ? true : undefined}
          aria-describedby={`${baseId}-hint ${error ? `${baseId}-error` : `${baseId}-count`}`}
        />
        <div className={controls.textareaMeta}>
          {error ? <p id={`${baseId}-error`} className={controls.fieldError} role="alert">{error}</p> : <span />}
          <span id={`${baseId}-count`} className={controls.counter}>{reason.length} / {MAX_CANCEL_REASON_LENGTH}</span>
        </div>
        <div className={controls.dialogActions}>
          <button type="button" className={controls.button} onClick={onClose}>닫기</button>
          <CancelSubmitButton onDone={onClose} />
        </div>
      </form>
    </dialog>
  );
}

export function StatusChangeForm({
  action,
  orderCode,
  currentLabel,
  status,
  choices,
}: {
  action: (formData: FormData) => Promise<void>;
  orderCode: string;
  currentLabel: string;
  status: OrderStatus;
  choices: Choice[];
}) {
  const id = `status-${orderCode}`;
  const [cancelOpen, setCancelOpen] = useState(false);
  return (
    <>
      <form className={controls.statusForm} action={action} onSubmit={(event) => {
        const selected = event.currentTarget.elements.namedItem("nextStatus") as HTMLSelectElement;
        if (!selected.value || selected.value === "canceled") event.preventDefault();
      }}>
        <StatusSelect
          id={id}
          orderCode={orderCode}
          currentLabel={currentLabel}
          status={status}
          choices={choices}
          onCancelSelect={() => setCancelOpen(true)}
        />
      </form>
      {cancelOpen && <CancelReasonDialog action={action} orderCode={orderCode} onClose={() => setCancelOpen(false)} />}
    </>
  );
}
