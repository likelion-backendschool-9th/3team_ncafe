"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Role } from "@/app/_lib/auth/types";
import { ARTIST_MAX_LENGTH, SONG_TITLE_MAX_LENGTH, STORY_MAX_LENGTH } from "@/app/_lib/songs/types";
import { submitMusicRequest, type RequestFormState } from "../_actions";
import styles from "../music-box.module.css";

const initialState: RequestFormState = { values: { songTitle: "", artist: "", story: "" }, errors: {} };
const fields = ["songTitle", "artist", "story"] as const;

type Props = {
  // 로그인한 회원. 고객 회원이 아니면 메모지를 잠그고 안내를 띄운다.
  member: { name: string; role: Role } | null;
  requestNumber: number;
};

export function RequestForm({ member, requestNumber }: Props) {
  const [state, formAction, pending] = useActionState(submitMusicRequest, initialState);
  const [storyLength, setStoryLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const locked = member?.role !== "customer";
  const memberName = member?.role === "customer" ? member.name : null;

  // 제출이 거절되면 첫 오류 칸으로 포커스를 옮긴다.
  useEffect(() => {
    const first = fields.find((name) => state.errors[name]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  const errorProps = (name: (typeof fields)[number]) => state.errors[name]
    ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
    : {};

  return (
    <section className={styles.memo} aria-labelledby="request-title">
      <span className={`${styles.tape} ${styles.tapeLeft}`} aria-hidden="true" />
      <span className={`${styles.tape} ${styles.tapeRight}`} aria-hidden="true" />

      <form ref={formRef} action={formAction} className={styles.slip} inert={locked} aria-hidden={locked} noValidate>
        <h2 id="request-title" className={styles.slipTitle}>신 청 곡</h2>
        <p className={styles.slipNumber}>No. {String(requestNumber).padStart(4, "0")}</p>

        <label className={styles.slipLine}>
          <span className={styles.slipLabel}>곡 명</span>
          <input name="songTitle" type="text" maxLength={SONG_TITLE_MAX_LENGTH} placeholder="듣고 싶은 노래 제목" required defaultValue={state.values.songTitle} {...errorProps("songTitle")} />
          {state.errors.songTitle && <span id="songTitle-error" className={styles.fieldError}>{state.errors.songTitle}</span>}
        </label>
        <label className={styles.slipLine}>
          <span className={styles.slipLabel}>가수이름</span>
          <input name="artist" type="text" maxLength={ARTIST_MAX_LENGTH} placeholder="가수 이름" required defaultValue={state.values.artist} {...errorProps("artist")} />
          {state.errors.artist && <span id="artist-error" className={styles.fieldError}>{state.errors.artist}</span>}
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
            maxLength={STORY_MAX_LENGTH}
            placeholder="이 노래와 함께 전하고 싶은 이야기를 적어 주세요."
            required
            defaultValue={state.values.story}
            {...errorProps("story")}
            onChange={(event) => setStoryLength(event.target.value.length)}
          />
          <span className={styles.counter} aria-live="polite">{storyLength} / {STORY_MAX_LENGTH}</span>
          {state.errors.story && <span id="story-error" className={styles.fieldError}>{state.errors.story}</span>}
        </label>

        {state.message && <p className={styles.formError} role="alert">{state.message}</p>}

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

      {locked && member && (
        <div className={styles.memberGate}>
          <strong>🔒 신청은 고객 회원만 할 수 있어요</strong>
          <p>신청곡은 고객 회원 계정으로 보낼 수 있어요.<br />신청곡 목록과 지금 나오는 음악은 누구나 볼 수 있어요.</p>
        </div>
      )}

      {!member && (
        <div className={styles.memberGate}>
          <strong>🔒 신청은 회원만 할 수 있어요</strong>
          <p>로그인하면 신청곡 메모지에 노래와 사연을 적을 수 있어요.<br />신청곡 목록과 지금 나오는 음악은 누구나 볼 수 있어요.</p>
          <div className={styles.gateActions}>
            <Link className={styles.gatePrimary} href="/login?next=%2Fmusicbox">로그인</Link>
            <Link className={styles.gateSecondary} href="/signup">회원가입</Link>
          </div>
        </div>
      )}
    </section>
  );
}
