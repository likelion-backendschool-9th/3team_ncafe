import type { Metadata } from "next";
import { safeNext } from "@/app/_lib/auth/navigation";
import { SignupForm } from "./_components/SignupForm";
import styles from "./signup.module.css";

export const metadata: Metadata = { title: "회원가입", robots: { index: false } };

// 회원증 발급일. 서버에서 한 번 정해 내려 줘야 자정 무렵에도 서버·브라우저 화면이 어긋나지 않는다.
function issuedDate(): string {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}. ${pick("month")}. ${pick("day")}`;
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);

  return (
    <main className={`container ${styles.page}`}>
      <SignupForm next={next} issuedOn={issuedDate()}
        heading={<h1 id="signup-title" className={styles.title}>단골 장부에 이름 올리기</h1>} />
    </main>
  );
}
