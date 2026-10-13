"use client";

import { useFormStatus } from "react-dom";
import controls from "./order-controls.module.css";

type Choice = { value: string; label: string };

function StatusSelect({ id, orderCode, currentLabel, choices }: {
  id: string;
  orderCode: string;
  currentLabel: string;
  choices: Choice[];
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <select
        className={`${controls.select} ${controls.statusSelect}`}
        id={id}
        name="nextStatus"
        defaultValue=""
        required
        disabled={pending}
        aria-label={`${orderCode} 주문 상태 변경`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>{currentLabel}</option>
        {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </select>
      {pending && <span className={controls.pending} role="status">변경 중…</span>}
    </>
  );
}

export function StatusChangeForm({
  action,
  orderCode,
  currentLabel,
  choices,
}: {
  action: (formData: FormData) => Promise<void>;
  orderCode: string;
  currentLabel: string;
  choices: Choice[];
}) {
  const id = `status-${orderCode}`;
  return (
    <form className={controls.statusForm} action={action} onSubmit={(event) => {
      const selected = event.currentTarget.elements.namedItem("nextStatus") as HTMLSelectElement;
      if (!selected.value) {
        event.preventDefault();
      } else if (selected.value === "canceled" && !window.confirm(`${orderCode} 주문을 취소할까요?`)) {
        event.preventDefault();
        selected.value = "";
      }
    }}>
      <StatusSelect id={id} orderCode={orderCode} currentLabel={currentLabel} choices={choices} />
    </form>
  );
}
