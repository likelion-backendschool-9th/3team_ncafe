import type { UserSummaryResponse } from "../_lib/user";
import styles from "../users.module.css";

type Props = { summary: UserSummaryResponse };

export function UserSummary({ summary }: Props) {
  return (
    <section className={styles.summary} aria-label="회원 현황">
      <div className={styles.metric}><span>전체 회원</span><strong>{summary.totalCount}<small>명</small></strong></div>
      <div className={styles.metric}><span>정상 이용</span><strong>{summary.activeCount}<small>명</small></strong></div>
      <div className={styles.metric}><span>이용 정지</span><strong>{summary.suspendedCount}<small>명</small></strong></div>
    </section>
  );
}
