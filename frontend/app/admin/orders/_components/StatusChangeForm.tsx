"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { statusLabels, type OrderAction, type OrderStatus } from "../_lib/types";
import { ConfirmCancelDialog } from "./ConfirmCancelDialog";
import controls from "./order-controls.module.css";

type Props = { action: OrderAction; orderCode: string; status: OrderStatus; allowedStatuses: OrderStatus[] };
export function StatusChangeForm({ action, orderCode, status, allowedStatuses }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const select = useRef<HTMLSelectElement>(null);
  const id = useId();
  const progress: OrderStatus[] = ["received", "preparing", "ready", "completed"];
  const choices = allowedStatuses.filter(target => target !== "canceled");
  useEffect(() => {
    if (state.error && state.value !== "canceled") select.current?.focus();
  }, [state.error, state.value]);

  return <div className={controls.statusControl}>
    <form className={controls.statusForm} action={formAction} aria-busy={pending}>
      <label className={controls.statusLabel} htmlFor={id}>주문 {orderCode} 상태 변경</label>
      <select ref={select} className={`${controls.select} ${controls.statusSelect}`} data-status={status}
        id={id} name="nextStatus" defaultValue={state.value ?? ""} required disabled={pending}
        aria-invalid={Boolean(state.error && state.value !== "canceled")}
        aria-describedby={state.error && state.value !== "canceled" ? `${id}-error` : undefined}>
        <option value="" disabled>현재: {statusLabels[status]}</option>
        {choices.map(target => <option key={target} value={target}>
          {progress.indexOf(target) < progress.indexOf(status) ? "이전" : "다음"}: {statusLabels[target]}
        </option>)}
      </select>
      <button className={`${controls.button} ${controls.primaryButton}`} type="submit" disabled={pending}>
        {pending ? "변경 중…" : "변경"}
      </button>
      {state.error && state.value !== "canceled" && <p id={`${id}-error`} className={controls.fieldError} role="alert">{state.error}</p>}
    </form>
    {allowedStatuses.includes("canceled") && <>
      <button className={controls.button} type="button" disabled={pending}
        onClick={() => { setCancelReason(""); setCancelOpen(true); }}>주문 취소</button>
      <ConfirmCancelDialog open={cancelOpen} orderCode={orderCode} pending={pending} action={formAction}
        reason={cancelReason} onReasonChange={setCancelReason}
        error={state.value === "canceled" ? state.error : undefined}
        onClose={() => { setCancelOpen(false); setCancelReason(""); }} />
    </>}
  </div>;
}
