import type { OrderCounts } from "../_lib/queries";
import styles from "../order-dashboard.module.css";

type Props = { counts: OrderCounts };
export function OrderSummary({ counts }: Props) {
  return <section className={styles.summary} aria-label="전체 주문 현황">
    <div><span>전체 주문</span><strong>{counts.total}</strong></div>
    <div><span>처리 중</span><strong>{counts.active}</strong></div>
    <div><span>완료</span><strong>{counts.completed}</strong></div>
    <div><span>취소</span><strong>{counts.canceled}</strong></div>
  </section>;
}
