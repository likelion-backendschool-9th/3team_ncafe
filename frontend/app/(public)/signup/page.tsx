import type { Metadata } from "next";
import { SignupForm } from "./_components/SignupForm";
import styles from "./signup.module.css";

export const metadata: Metadata = { title: "회원가입 | 삼다방" };

const messages: Record<string, string> = {
  invalid: "닉네임은 2자 이상, 비밀번호는 8자 이상으로 적고 이메일 형식을 확인해 주세요.",
  mismatch: "비밀번호 확인이 일치하지 않습니다.",
  exists: "이미 가입된 이메일입니다. 로그인해 주세요.",
};

// 회원증 발급일. 서버에서 한 번 정해 내려 줘야 자정 무렵에도 서버·브라우저 화면이 어긋나지 않는다.
function issuedDate(): string {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}. ${pick("month")}. ${pick("day")}`;
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className={`container ${styles.page}`}>
      <SignupForm error={error ? messages[error] ?? "입력을 확인해 주세요." : undefined} issuedOn={issuedDate()} />
    </main>
  );
}
