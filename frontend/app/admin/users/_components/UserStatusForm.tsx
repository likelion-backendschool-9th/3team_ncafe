"use client";

import { useActionState, useId, useRef, useState } from "react";
import { changeUserStatus, type UserStatusState } from "../_actions";
import { statusLabels, type UserResponse } from "../_lib/user";
import { useUserStatusFeedback } from "./UserStatusFeedback";
import styles from "../users.module.css";

type Props = { user: UserResponse; compact?: boolean };

export function UserStatusForm({ user, compact = false }: Props) {
  const reportFeedback = useUserStatusFeedback();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [showFeedback, setShowFeedback] = useState(false);
  const [state, formAction, pending] = useActionState<UserStatusState, FormData>(async (previous, formData) => {
    const result = await changeUserStatus(user.id, previous, formData);
    setShowFeedback(true);
    if (result.success) {
      if (compact && reportFeedback) reportFeedback(`${user.name}: ${result.success}`);
      dialog.current?.close();
    }
    return result;
  }, {});
  const nextStatus = user.status === "active" ? "suspended" : "active";
  const label = user.status === "active" ? "이용 정지" : "정지 해제";

  if (user.role === "admin") {
    return <span className={compact ? styles.protectedAction : styles.hint}>{compact ? "변경 제한" : "관리자 계정은 상태를 변경할 수 없습니다."}</span>;
  }

  return (
    <div className={styles.statusForm}>
      <button
        type="button"
        className={styles.outlineButton}
        disabled={pending}
        aria-label={`${user.name} 회원 ${label}`}
        onClick={() => {
          setShowFeedback(false);
          dialog.current?.showModal();
        }}
      >
        {pending ? "변경 중…" : label}
      </button>
      {showFeedback && state.success && (!compact || !reportFeedback) && <p className={styles.notice} role="status">{state.success}</p>}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
      >
        <form action={formAction} aria-busy={pending}>
          <h2 id={`${id}-title`}>회원 {label}</h2>
          <p id={`${id}-description`}>{user.name} ({user.email}) 회원의 상태를 변경하시겠습니까?</p>
          <p>
            <span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span>
            {" → "}
            <span className={`${styles.badge} ${styles[nextStatus]}`}>{statusLabels[nextStatus]}</span>
          </p>
          <input type="hidden" name="status" value={nextStatus} />
          {showFeedback && state.error && <p className={styles.error} role="alert">{state.error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondary} disabled={pending} autoFocus onClick={() => dialog.current?.close()}>취소</button>
            <button type="submit" disabled={pending}>{pending ? "변경 중…" : `${label} 확인`}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
