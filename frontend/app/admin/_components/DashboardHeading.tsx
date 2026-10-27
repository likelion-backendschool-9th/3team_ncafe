import styles from "../admin.module.css";

const todayFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" });

export function DashboardHeading() {
  return (
    <header className={styles.heading}>
      <p className={styles.eyebrow}>관리자 인덱스</p>
      <h1>삼다방 관리</h1>
      <span className={styles.divider} aria-hidden="true" />
      <p>회원과 메뉴, 주문, 뮤직박스의 운영 현황을 확인하고 관리합니다.</p>
      <p className={styles.today}><span className={styles.todayDot} aria-hidden="true" />{todayFormat.format(new Date())} 영업 장부</p>
    </header>
  );
}
