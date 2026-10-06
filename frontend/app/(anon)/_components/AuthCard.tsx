// 인증 카드 — 로그인·회원가입·비밀번호 찾기가 같이 쓰는 가운데 카드(m3-card). 제목·설명 아래에 페이지가 폼을 놓는다.
import type { ReactNode } from "react";

export default function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="display:flex justify-content:center padding-y:8">
      <section
        className="m3-card card:outlined card-padding:self width:full max-width:ex"
        style={{ "--max-width-ex": "26.25rem", "--card-padding-x": "2.5rem", "--card-padding-y": "2.5rem" }}
        aria-labelledby="auth-title"
      >
        <h1 id="auth-title" className="font-size:heading-sm font-weight:bold letter-spacing:tight">
          {title}
        </h1>
        <p className="margin-top:2 margin-bottom:7 font-size:body-sm color:text-muted">{description}</p>
        {children}
      </section>
    </div>
  );
}
