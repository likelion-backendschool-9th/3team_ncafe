import type { Metadata } from "next";
import { requireRole } from "@/app/_lib/session/session";
import { LogoutForm } from "./_components/LogoutForm";
import { MemberCard } from "./_components/MemberCard";
import { MyShortcuts } from "./_components/MyShortcuts";
import styles from "./mypage.module.css";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false } };

export default async function MyPage() {
  // requireRole이 백엔드 GET /api/v1/my로 로그인한 회원 정보를 받아 온다.
  const user = await requireRole("customer", "/my");

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>MY PAGE · 마이페이지</p>
        <h1>나의 다방 수첩</h1>
        <p>회원 정보와 신청곡, 장바구니, 주문을 한곳에서 챙기세요.</p>
      </header>

      <MemberCard user={user} />
      <MyShortcuts />
      <LogoutForm />
    </div>
  );
}
