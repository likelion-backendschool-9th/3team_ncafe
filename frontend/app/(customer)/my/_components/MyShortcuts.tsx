import Link from "next/link";
import styles from "../mypage.module.css";

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

export function MyShortcuts() {
  return (
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
  );
}
