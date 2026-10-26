import { roleLabels, statusLabels, type UserResponse } from "../_lib/user";
import styles from "../users.module.css";

type Props = { user: UserResponse };

export function UserProfilePanel({ user }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="user-info-title">
      <h2 id="user-info-title" className={styles.panelHeading}>기본 정보</h2>
      <div className={styles.profile}><div><h2>{user.name}</h2><span className={styles.secondary}>{roleLabels[user.role]}</span></div></div>
      <dl className={styles.details}>
        <div><dt>회원 ID</dt><dd>{user.id}</dd></div>
        <div><dt>닉네임</dt><dd>{user.name}</dd></div>
        <div><dt>이메일</dt><dd>{user.email}</dd></div>
        <div><dt>권한</dt><dd>{roleLabels[user.role]}</dd></div>
        <div><dt>이용 상태</dt><dd><span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></dd></div>
      </dl>
    </section>
  );
}
