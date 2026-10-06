// 비밀번호 찾기 — AuthCard 안에 m3-form 하나. 안내 상자는 form-message:info.
import Link from "next/link";
import AuthCard from "../_components/AuthCard";

export default function FindPasswordPage() {
  return (
    <AuthCard
      title="비밀번호 찾기"
      description="가입할 때 사용한 아이디와 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다."
    >
      <form className="m3-form form:compact" action="/find-password" method="post">
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
            <label htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" placeholder="example@ncafe.com" autoComplete="email" required />
          </div>
        </div>
        <div className="form-actions form-actions:stretch">
          <button type="submit" className="m3-btn btn-size:md">
            재설정 링크 보내기
          </button>
        </div>
        <div className="form-message form-message:info">
          <strong>메일이 오지 않나요?</strong>
          <p className="margin-top:1">
            스팸함을 확인하거나, 고객센터(<a href="mailto:help@ncafe.com">help@ncafe.com</a>)로 문의해 주세요.
          </p>
        </div>
      </form>
      <p className="margin-top:6 text-align:center font-size:body-sm color:text-muted">
        <Link href="/login" className="color:primary font-weight:semibold hover:text-decoration:underline">
          ← 로그인으로 돌아가기
        </Link>
      </p>
    </AuthCard>
  );
}
