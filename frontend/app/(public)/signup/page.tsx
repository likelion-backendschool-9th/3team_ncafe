import Link from "next/link";
import { signup } from "./_actions/signup";

const messages: Record<string, string> = {
  invalid: "이름은 2자 이상, 비밀번호는 8자 이상으로 입력하고 이메일 형식을 확인해 주세요.",
  mismatch: "비밀번호 확인이 일치하지 않습니다.",
  exists: "이미 가입된 이메일입니다.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="container auth-page">
      <div className="auth-card">
        <p className="eyebrow">계정</p>
        <h1>회원가입</h1>
        <p className="muted">가입한 계정은 로컬 목 저장소에 보관됩니다.</p>
        {error && <p className="form-error" role="alert">{messages[error] ?? "입력을 확인해 주세요."}</p>}
        <form action={signup} className="form-stack">
          <label>
            이름
            <input name="name" type="text" minLength={2} autoComplete="name" required />
          </label>
          <label>
            이메일
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            비밀번호
            <input name="password" type="password" minLength={8} autoComplete="new-password" required />
          </label>
          <label>
            비밀번호 확인
            <input name="passwordConfirm" type="password" minLength={8} autoComplete="new-password" required />
          </label>
          <button className="button" type="submit">가입하기</button>
        </form>
        <p className="auth-card__aside">이미 계정이 있나요? <Link href="/login">로그인</Link></p>
      </div>
    </main>
  );
}
