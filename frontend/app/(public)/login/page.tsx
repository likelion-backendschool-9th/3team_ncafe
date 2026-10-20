import Link from "next/link";
import { login } from "./_actions/login";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, next } = await searchParams;

  return (
    <main className="container auth-page">
      <div className="auth-card">
        <p className="eyebrow">계정</p>
        <h1>로그인</h1>
        <p className="muted">삼다방 계정으로 계속하세요.</p>
        {error && <p className="form-error" role="alert">이메일 또는 비밀번호를 확인해 주세요.</p>}
        <form action={login} className="form-stack">
          {next && <input type="hidden" name="next" value={next} />}
          <label>
            이메일
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            비밀번호
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button" type="submit">로그인</button>
        </form>
        <p className="auth-card__aside">계정이 없나요? <Link href="/signup">회원가입</Link></p>
        {process.env.NODE_ENV !== "production" && (
          <div className="demo-note">
            <strong>로컬 목 계정</strong>
            <span>관리자: admin@ncafe.local</span>
            <span>고객: customer@ncafe.local</span>
            <span>공통 비밀번호: demo1234!</span>
          </div>
        )}
      </div>
    </main>
  );
}
