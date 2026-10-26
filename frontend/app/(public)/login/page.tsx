import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/app/_lib/auth/navigation";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string | string[]; registered?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);

  return (
    <main className="container auth-page">
      <div className="auth-card">
        <p className="eyebrow">계정</p>
        <h1>로그인</h1>
        <p className="muted">삼다방 계정으로 계속하세요.</p>
        {params.registered === "1" && <p role="status">회원가입이 완료되었습니다. 가입한 계정으로 로그인해 주세요.</p>}
        <LoginForm next={next} />
        <p className="auth-card__aside">계정이 없나요? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>회원가입</Link></p>
      </div>
    </main>
  );
}
