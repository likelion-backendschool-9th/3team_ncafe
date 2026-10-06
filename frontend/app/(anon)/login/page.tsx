// 로그인 — AuthCard 안에 m3-form. 소셜 로그인은 divider:text 아래 outlined 버튼.
import Link from "next/link";
import AuthCard from "../_components/AuthCard";

export default function LoginPage() {
  return (
    <AuthCard title="로그인" description="NCafe 계정으로 로그인하세요.">
      <form className="m3-form form:compact" action="/login" method="post">
        <div className="form-fields">
          <div className="m3-text-field field:outlined field-label:top">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              required
            />
          </div>
          <div className="m3-text-field field:outlined field-label:top">
            <div className="display:flex align-items:center justify-content:space-between">
              <label htmlFor="password">비밀번호</label>
              <Link href="/find-password" className="font-size:caption color:text-muted hover:color:primary">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
          </div>
          <label className="m3-checkbox font-size:body-sm color:text-muted">
            <input type="checkbox" name="remember" /> 로그인 상태 유지
          </label>
        </div>
        <div className="form-actions form-actions:stretch">
          <button type="submit" className="m3-btn btn-size:md">
            로그인
          </button>
        </div>
      </form>

      <div className="m3-divider divider:text margin-y:6">
        <span>또는</span>
      </div>

      <div className="display:flex flex-direction:column gap:2">
        <button type="button" className="m3-btn btn:outlined btn-size:md btn-icon:leading width:full">
          <span
            className="display:inline-flex align-items:center justify-content:center width:6 height:6 border-radius:full background-color:secondary color:on-secondary font-size:caption font-weight:bold"
            aria-hidden="true"
          >
            G
          </span>
          Google로 계속하기
        </button>
        <button type="button" className="m3-btn btn:outlined btn-size:md btn-icon:leading width:full">
          <span
            className="display:inline-flex align-items:center justify-content:center width:6 height:6 border-radius:full background-color:surface-inverse color:text-inverse font-size:caption font-weight:bold"
            aria-hidden="true"
          >
            Gh
          </span>
          GitHub로 계속하기
        </button>
      </div>

      <p className="margin-top:6 text-align:center font-size:body-sm color:text-muted">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="color:primary font-weight:semibold hover:text-decoration:underline">
          회원가입
        </Link>
      </p>
    </AuthCard>
  );
}
