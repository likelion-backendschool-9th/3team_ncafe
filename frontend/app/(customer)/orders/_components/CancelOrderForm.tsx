"use client";

import { useFormStatus } from "react-dom";
import styles from "../orders.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className={styles.cancelButton} type="submit" disabled={pending}>{pending ? "취소 중..." : "주문 취소"}</button>;
}

export function CancelOrderForm({ action, orderCode }: {
  action: () => Promise<void>;
  orderCode: string;
}) {
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(`${orderCode} 주문을 취소할까요?`)) event.preventDefault();
    }}>
      <SubmitButton />
    </form>
  );
}
