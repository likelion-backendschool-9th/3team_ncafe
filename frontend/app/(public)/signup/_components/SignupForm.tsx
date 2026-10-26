"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "@/app/_components/BrandLogo";
import { signup, type SignupFormState } from "../_actions/signup";
import styles from "../signup.module.css";

type Props = {
  issuedOn: string;
  next: string | null;
  heading: ReactNode;
};

export function SignupForm({ issuedOn, next, heading }: Props) {
  const initial: SignupFormState = {
    values: { name: "", email: "", next: next ?? "" }, errors: {}, message: "", revision: 0,
  };
  const [state, action, pending] = useActionState(signup, initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  const trimmedName = name.trim();
  useEffect(() => {
    if (!state.revision) return;
    const invalid = form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else if (state.message) message.current?.focus();
  }, [state]);

  return (
    <div className={styles.layout}>
      {/* 입력하는 동안 채워지는 회원증. 폼과 같은 내용이라 보조기기에는 읽히지 않게 둔다. */}
      <aside className={styles.cardSide} aria-hidden="true">
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <BrandLogo compact />
            <div className={styles.cardTitle}>
              <strong>단골 회원증</strong>
              <span>REGULAR GUEST CARD</span>
            </div>
          </div>
          <dl className={styles.cardRows}>
            <div>
              <dt>닉네임</dt>
              <dd className={trimmedName ? styles.cardName : styles.cardBlank}>{trimmedName || "닉네임을 적어 주세요"}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd className={email.trim() ? styles.cardEmail : styles.cardBlank}>{email.trim() || "이메일"}</dd>
            </div>
            <div>
              <dt>발급일</dt>
              <dd>{issuedOn}</dd>
            </div>
          </dl>
          <span className={`${styles.stamp} ${[...trimmedName].length >= 2 ? styles.stampOn : ""}`}>
            <small>삼다방</small>
            단골
          </span>
        </div>

        <div className={styles.perks}>
          <p>단골이 되시면</p>
          <ul>
            <li><span>☕</span>메뉴를 미리 주문하고 카운터에서 픽업</li>
            <li><span>📻</span>사연 한 줄 담아 뮤직박스에 신청곡</li>
            <li><span>🧾</span>지난 주문과 신청곡을 한눈에</li>
          </ul>
        </div>
      </aside>

      <section className={styles.sheet} aria-labelledby="signup-title">
        <p className={styles.eyebrow}>회원가입</p>
        {heading}
        <p className={styles.lead}>몇 가지만 적어 주시면 바로 회원증을 내어 드려요.</p>

        <p ref={message} className={state.message ? styles.error : undefined} role="alert" tabIndex={-1} hidden={!state.message}>
          {state.message}
        </p>

        <form ref={form} action={action} className={styles.form} noValidate aria-busy={pending}>
          <input type="hidden" name="next" value={state.values.next} />
          <div className={styles.field}>
            <label htmlFor="signup-name">닉네임</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              maxLength={100}
              autoComplete="nickname"
              required
              defaultValue={state.values.name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!state.errors.name}
              aria-describedby={`signup-name-hint${state.errors.name ? " signup-name-error" : ""}`}
            />
            <p id="signup-name-hint" className={styles.hint}>주문서와 신청곡 메모에 적힐 닉네임이에요. 2~50자.</p>
            {state.errors.name && <span id="signup-name-error" className={styles.hintWarn}>{state.errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-email">이메일</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              required
              defaultValue={state.values.email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!state.errors.email}
              aria-describedby={`signup-email-hint${state.errors.email ? " signup-email-error" : ""}`}
            />
            <p id="signup-email-hint" className={styles.hint}>로그인할 때 쓰는 주소예요.</p>
            {state.errors.email && <span id="signup-email-error" className={styles.hintWarn}>{state.errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.errors.password}
              aria-describedby={`signup-password-hint${state.errors.password ? " signup-password-error" : ""}`}
            />
            <p id="signup-password-hint" className={styles.hint}>8자 이상, UTF-8 기준 72바이트 이하로 적어 주세요.</p>
            {state.errors.password && <span id="signup-password-error" className={styles.hintWarn}>{state.errors.password}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              id="signup-password-confirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.errors.passwordConfirm}
              aria-describedby={`signup-password-confirm-hint${state.errors.passwordConfirm ? " signup-password-confirm-error" : ""}`}
            />
            <p id="signup-password-confirm-hint" className={styles.hint}>같은 비밀번호를 한 번 더 적어 주세요.</p>
            {state.errors.passwordConfirm && <span id="signup-password-confirm-error" className={styles.hintWarn}>{state.errors.passwordConfirm}</span>}
          </div>

          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "장부에 적는 중…" : "단골로 등록하기"}
          </button>
        </form>

        <p className={styles.aside}>
          이미 단골이신가요? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>로그인</Link>
        </p>
      </section>
    </div>
  );
}
