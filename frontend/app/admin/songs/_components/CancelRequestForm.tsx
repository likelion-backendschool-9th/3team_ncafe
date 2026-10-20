"use client";

import styles from "../music-box.module.css";

// 신청 취소는 되돌릴 수 없어서 한 번 더 묻는다. 취소한 신청은 신청자 마이페이지에 '취소됨'으로 남는다.
export function CancelRequestForm({ action, songTitle }: { action: () => Promise<void>; songTitle: string }) {
  return (
    <form
      action={action}
      className={styles.pushEnd}
      onSubmit={(event) => {
        if (!window.confirm(`'${songTitle}' 신청을 취소할까요?\n신청자 마이페이지에는 '취소됨'으로 보여요.`)) event.preventDefault();
      }}
    >
      <button className={styles.dangerButton} type="submit">신청 취소</button>
    </form>
  );
}
