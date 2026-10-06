// 회원가입 — AuthCard 안에 m3-form. 중복 확인·인증 요청은 입력 옆 outlined 버튼, 규칙 표시는 배지, 약관은 form-group 안 체크박스.
import Link from "next/link";
import AuthCard from "../_components/AuthCard";

const RULES = [
  { text: "8자 이상", ok: true },
  { text: "영문 포함", ok: false },
  { text: "숫자 포함", ok: false },
  { text: "특수문자 포함", ok: false },
];

function Required() {
  return (
    <span className="color:danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export default function SignupPage() {
  return (
    <AuthCard title="회원가입" description="NCafe에 가입하고 온라인으로 주문해 보세요.">
      <form className="m3-form form:compact" action="/signup" method="post">
        <div className="form-fields">
          <div className="m3-text-field field:outlined field-label:top">
            <label htmlFor="username">
              아이디
              <Required />
            </label>
            <div className="display:flex gap:2">
              <input
                id="username"
                name="username"
                type="text"
                className="flex:1"
                placeholder="영문, 숫자 4~20자"
                autoComplete="username"
                required
              />
              <button type="button" className="m3-btn btn:outlined">
                중복 확인
              </button>
            </div>
            <span className="field-supporting">영문 소문자와 숫자만 사용할 수 있습니다.</span>
          </div>

          <div className="m3-text-field field:outlined field-label:top">
            <label htmlFor="name">
              이름
              <Required />
            </label>
            <input id="name" name="name" type="text" placeholder="이름을 입력하세요" autoComplete="name" required />
          </div>

          <div className="m3-text-field field:outlined field-label:top">
            <label htmlFor="email">
              이메일
              <Required />
            </label>
            <div className="display:flex gap:2">
              <input
                id="email"
                name="email"
                type="email"
                className="flex:1"
                placeholder="example@ncafe.com"
                autoComplete="email"
                required
              />
              <button type="button" className="m3-btn btn:outlined">
                인증 요청
              </button>
            </div>
          </div>

          <div className="m3-text-field field:outlined field-label:top">
            <label htmlFor="password">
              비밀번호
              <Required />
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="8자 이상, 영문·숫자·특수문자 조합"
              autoComplete="new-password"
              required
            />
            <ul
              className="display:flex flex-wrap:wrap gap:1 margin-top:2 padding:0 list-style-type:none"
              aria-label="비밀번호 규칙"
            >
              {RULES.map((r) => (
                <li key={r.text}>
                  <span className={`m3-badge badge:inline badge-color:${r.ok ? "success" : "neutral"}`}>{r.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="m3-text-field field:outlined field-label:top field-state:error">
            <label htmlFor="passwordConfirm">
              비밀번호 확인
              <Required />
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              aria-invalid="true"
              required
            />
            <span className="field-supporting">비밀번호가 일치하지 않습니다.</span>
          </div>

          <fieldset className="form-group">
            <legend className="form-group-label">약관 동의</legend>
            <label className="m3-checkbox font-weight:semibold">
              <input type="checkbox" /> 전체 동의
            </label>
            <label className="m3-checkbox">
              <input type="checkbox" name="agreeTerms" required />
              <span>
                [필수] 이용약관 동의{" "}
                <Link href="/" className="color:text-muted text-decoration:underline">
                  보기
                </Link>
              </span>
            </label>
            <label className="m3-checkbox">
              <input type="checkbox" name="agreePrivacy" required />
              <span>
                [필수] 개인정보 수집 및 이용 동의{" "}
                <Link href="/" className="color:text-muted text-decoration:underline">
                  보기
                </Link>
              </span>
            </label>
            <label className="m3-checkbox">
              <input type="checkbox" name="agreeMarketing" />
              <span>[선택] 이벤트 · 혜택 정보 수신 동의</span>
            </label>
          </fieldset>
        </div>
        <div className="form-actions form-actions:stretch">
          <button type="submit" className="m3-btn btn-size:md">
            가입하기
          </button>
        </div>
      </form>
      <p className="margin-top:6 text-align:center font-size:body-sm color:text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="color:primary font-weight:semibold hover:text-decoration:underline">
          로그인
        </Link>
      </p>
    </AuthCard>
  );
}
