import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/_lib/session/logout";
import { requireRole } from "@/app/_lib/session/session";
import styles from "./mypage.module.css";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false } };

const shortcuts = [
  {
    href: "/my/songs",
    no: "01",
    title: "신청곡 · 사연 관리",
    description: "뮤직박스에 보낸 신청곡과 사연을 확인하고 삭제합니다.",
  },
  {
    href: "/cart",
    no: "02",
    title: "장바구니 관리",
    description: "담아 둔 메뉴의 수량을 바꾸고 주문합니다.",
  },
  {
    href: "/my/orders",
    no: "03",
    title: "주문 목록 관리",
    description: "진행 중인 주문과 지난 주문을 확인합니다.",
  },
];

export default async function MyPage() {
  const user = await requireRole("customer", "/my");

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>MY PAGE · 마이페이지</p>
        <h1>나의 다방 수첩</h1>
        <p>회원 정보와 신청곡, 장바구니, 주문을 한곳에서 챙기세요.</p>
      </header>

      <section className={styles.memberCard} aria-labelledby="member-card-title">
        <div className={styles.memberCardTop}>
          <h2 id="member-card-title">삼다방 단골 회원증</h2>
          <span>No. {user.id}</span>
        </div>
        <dl className={styles.memberFields}>
          <div>
            <dt>성함</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
        <span className={styles.stamp} aria-hidden="true">
          단골
          <small>SAMDABANG</small>
        </span>
      </section>

      <nav className={styles.shortcuts} aria-label="마이페이지 메뉴">
        {shortcuts.map((item) => (
          <Link key={item.href} className={styles.shortcut} href={item.href}>
            <span className={styles.shortcutNo} aria-hidden="true">
              {item.no}
            </span>
            <span className={styles.shortcutText}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </span>
            <span className={styles.shortcutArrow} aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>

      <form action={logout} className={styles.logout}>
        <button type="submit" className={styles.logoutButton}>
          로그아웃
        </button>
      </form>
    </div>
  );
}
