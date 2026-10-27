import type { MenuSummaryResponse } from "../_lib/api";
import styles from "../admin.module.css";

type Props = { summary: MenuSummaryResponse };

export function MenuSummary({ summary }: Props) {
  return (
    <section className={styles.summary} aria-label="메뉴 현황">
      <div className={styles.metric}><span>전체 메뉴</span><strong>{summary.totalCount}<small>개</small></strong></div>
      <div className={styles.metric}><span>판매 중</span><strong>{summary.availableCount}<small>개</small></strong></div>
      <div className={styles.metric}><span>판매 중지</span><strong>{summary.unavailableCount}<small>개</small></strong></div>
    </section>
  );
}
