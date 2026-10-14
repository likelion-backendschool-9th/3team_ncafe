"use client";

import { useFormStatus } from "react-dom";
import styles from "@/app/(public)/music-box/_components/request-memo.module.css";

function SubmitButton({ songTitle }: { songTitle: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={styles.removeButton}
      type="submit"
      disabled={pending}
      aria-label={`${songTitle} 신청곡 삭제`}
      title="신청곡 삭제"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export function DeleteRequestForm({ action, songTitle }: {
  action: () => Promise<void>;
  songTitle: string;
}) {
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(`'${songTitle}' 신청곡과 사연을 삭제할까요?`)) event.preventDefault();
    }}>
      <SubmitButton songTitle={songTitle} />
    </form>
  );
}
