import type { OrderFlash } from "../_lib/searchParams";
import styles from "../order-dashboard.module.css";

type Props = { flash: OrderFlash };
export function OrderFeedback({ flash }: Props) {
  const messages = {
    STALE_STATUS: "주문 상태가 이미 변경됐습니다. 새로 불러온 상태를 확인해 주세요.",
    INVALID_STATUS: "해당 상태로 변경할 수 없습니다. 현재 주문 상태를 확인해 주세요.",
    NOT_FOUND: "주문을 찾을 수 없습니다. 현재 목록을 확인해 주세요.",
  };
  if (flash.error) return <p className={styles.error} role="alert">{messages[flash.error]}</p>;
  if (flash.updated) return <p className={styles.notice} role="status">주문 상태를 변경했습니다.</p>;
  return null;
}
