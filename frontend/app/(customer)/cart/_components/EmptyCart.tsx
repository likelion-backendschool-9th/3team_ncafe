import Link from "next/link";
import styles from "../cart.module.css";

export function EmptyCart() {
  return (
    <div className={styles.empty}>
      <p>장바구니가 비어 있습니다.</p>
      <p>다방 메뉴를 둘러보고 담아보세요.</p>
      <Link href="/menus">메뉴 담으러 가기</Link>
    </div>
  );
}
