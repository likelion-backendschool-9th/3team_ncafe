import styles from "../admin.module.css";

type Props = { total: number; available: number };

export function MenuSummary({ total, available }: Props) {
  return (
    <section className={styles.summary} aria-label="메뉴 현황">
      <div className={styles.metric}><span>전체 메뉴</span><strong>{total}<small>개</small></strong></div>
      <div className={styles.metric}><span>판매 중</span><strong>{available}<small>개</small></strong></div>
      <div className={styles.metric}><span>판매 중지</span><strong>{total - available}<small>개</small></strong></div>
    </section>
  );
}
