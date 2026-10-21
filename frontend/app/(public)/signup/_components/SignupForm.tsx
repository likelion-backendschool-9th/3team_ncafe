"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { BrandLogo } from "@/app/_components/BrandLogo";
import { signup } from "../_actions/signup";
import styles from "../signup.module.css";

const MIN_NAME = 2;
const MIN_PASSWORD = 8;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.submit} type="submit" disabled={pending}>
      {pending ? "장부에 적는 중…" : "단골로 등록하기"}
    </button>
  );
}

type SignupFormProps = {
  error?: string;
  issuedOn: string;
};

export function SignupForm({ error, issuedOn }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const trimmedName = name.trim();
  const passwordLongEnough = password.length >= MIN_PASSWORD;
  const confirmMatches = passwordConfirm.length > 0 && password === passwordConfirm;

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
          <span className={`${styles.stamp} ${trimmedName.length >= MIN_NAME ? styles.stampOn : ""}`}>
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
        <h1 id="signup-title" className={styles.title}>단골 장부에 이름 올리기</h1>
        <p className={styles.lead}>몇 가지만 적어 주시면 바로 회원증을 내어 드려요.</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <form action={signup} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="signup-name">닉네임</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              minLength={MIN_NAME}
              autoComplete="nickname"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-describedby="signup-name-hint"
            />
            <p id="signup-name-hint" className={styles.hint}>주문서와 신청곡 메모에 적힐 닉네임이에요. 2자 이상.</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-email">이메일</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby="signup-email-hint"
            />
            <p id="signup-email-hint" className={styles.hint}>로그인할 때 쓰는 주소예요.</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="signup-password-hint"
            />
            <p id="signup-password-hint" className={`${styles.hint} ${passwordLongEnough ? styles.hintOk : ""}`}>
              <span aria-hidden="true">{passwordLongEnough ? "✓" : "·"}</span> 8자 이상
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              id="signup-password-confirm"
              name="passwordConfirm"
              type="password"
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              required
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              aria-describedby="signup-password-confirm-hint"
            />
            <p
              id="signup-password-confirm-hint"
              className={`${styles.hint} ${confirmMatches ? styles.hintOk : passwordConfirm ? styles.hintWarn : ""}`}
              aria-live="polite"
            >
              {passwordConfirm.length === 0
                ? "한 번 더 적어 주세요."
                : confirmMatches
                  ? <><span aria-hidden="true">✓</span> 비밀번호가 일치해요.</>
                  : <><span aria-hidden="true">!</span> 아직 일치하지 않아요.</>}
            </p>
          </div>

          <SubmitButton />
        </form>

        <p className={styles.aside}>
          이미 단골이신가요? <Link href="/login">로그인</Link>
        </p>
      </section>
    </div>
  );
}
