"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitMusicRequest, type RequestFormState } from "../_actions";
import styles from "../music-box.module.css";

const initialState: RequestFormState = {};
const storyMaxLength = 500;

type RequestFormProps = {
  // 로그인한 회원 이름. 없으면 메모지를 잠그고 로그인 안내를 띄운다.
  memberName: string | null;
  requestNumber: number;
};

export function RequestForm({ memberName, requestNumber }: RequestFormProps) {
  const [state, formAction, pending] = useActionState(submitMusicRequest, initialState);
  const [storyLength, setStoryLength] = useState(0);
  const locked = memberName === null;

  return (
    <section className={styles.memo} aria-labelledby="request-title">
      <span className={`${styles.tape} ${styles.tapeLeft}`} aria-hidden="true" />
      <span className={`${styles.tape} ${styles.tapeRight}`} aria-hidden="true" />

      <form action={formAction} className={styles.slip} inert={locked} aria-hidden={locked}>
        <h2 id="request-title" className={styles.slipTitle}>신 청 곡</h2>
        <p className={styles.slipNumber}>No. {String(requestNumber).padStart(4, "0")}</p>

        <label className={styles.slipLine}>
          <span className={styles.slipLabel}>곡 명</span>
          <input name="songTitle" type="text" maxLength={100} placeholder="듣고 싶은 노래 제목" required />
        </label>
        <label className={styles.slipLine}>
          <span className={styles.slipLabel}>가수이름</span>
          <input name="artist" type="text" maxLength={80} placeholder="가수 이름" required />
        </label>
        <div className={styles.slipLine}>
          <span className={styles.slipLabel}>신 청 인</span>
          <p className={styles.requester}>
            {memberName ?? "로그인하면 자동으로 적혀요"}
            {memberName && <small>회원 이름으로 자동 기입</small>}
          </p>
        </div>
        <label className={styles.storyField}>
          <span className={styles.slipLabel}>사 연</span>
          <textarea
            name="story"
            rows={5}
            maxLength={storyMaxLength}
            placeholder="이 노래와 함께 전하고 싶은 이야기를 적어 주세요."
            required
            onChange={(event) => setStoryLength(event.target.value.length)}
          />
          <span className={styles.counter} aria-live="polite">{storyLength} / {storyMaxLength}</span>
        </label>

        {state.error && <p className={styles.formError} role="alert">{state.error}</p>}

        <div className={styles.slipFoot}>
          <span aria-hidden="true" />
          <div className={styles.shopMark}>
            <p>차와 음악이 있는~</p>
            <p className={styles.shopName}>삼 다 방 <span>☎ SINCE 1987</span></p>
          </div>
          <button className={styles.submitButton} type="submit" disabled={pending}>
            {pending ? "접수 중…" : "➤ 신청하기"}
          </button>
        </div>
      </form>

      {locked && (
        <div className={styles.memberGate}>
          <strong>🔒 신청은 회원만 할 수 있어요</strong>
          <p>로그인하면 신청곡 메모지에 노래와 사연을 적을 수 있어요.<br />신청곡 목록과 지금 나오는 음악은 누구나 볼 수 있어요.</p>
          <div className={styles.gateActions}>
            <Link className={styles.gatePrimary} href="/login?next=%2Fmusic-box">로그인</Link>
            <Link className={styles.gateSecondary} href="/signup">회원가입</Link>
          </div>
        </div>
      )}
    </section>
  );
}
