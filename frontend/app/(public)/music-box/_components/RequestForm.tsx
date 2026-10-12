"use client";

import { useActionState } from "react";
import { submitMusicRequest, type RequestFormState } from "../_actions";
import styles from "../music-box.module.css";

const initialState: RequestFormState = {};

export function RequestForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(submitMusicRequest, initialState);

  return (
    <form action={formAction} className={styles.requestForm}>
      <div className={styles.formGrid}>
        <label>
          신청자 이름
          <input name="requesterName" type="text" maxLength={30} defaultValue={defaultName} required />
        </label>
        <label>
          노래 제목
          <input name="songTitle" type="text" maxLength={100} placeholder="듣고 싶은 곡 제목" required />
        </label>
        <label>
          가수
          <input name="artist" type="text" maxLength={80} placeholder="가수 이름" required />
        </label>
        <label className={styles.storyField}>
          사연
          <textarea name="story" rows={5} maxLength={500} placeholder="이 노래와 함께 전하고 싶은 이야기를 적어 주세요." required />
        </label>
      </div>
      <p className={styles.formHint}>신청자 이름과 사연은 곡을 소개할 때 뮤직박스 화면에 공개됩니다.</p>
      {state.error && <p className={styles.formError} role="alert">{state.error}</p>}
      <button className={styles.submitButton} type="submit" disabled={pending}>
        {pending ? "접수 중…" : "사연과 신청곡 보내기"}
      </button>
    </form>
  );
}
