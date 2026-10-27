import styles from "../orders.module.css";

type Props = { reason: string | null };
export function OrderCancelReason({ reason }: Props) {
  return <div className={styles.cancelReason}>
    <strong>매장 취소 사유</strong>
    <p>{reason ?? "등록된 취소 사유가 없습니다."}</p>
  </div>;
}
