import { statusLabels, type UserResponse } from "../_lib/user";
import { UserStatusForm } from "./UserStatusForm";
import styles from "../users.module.css";

type Props = { user: UserResponse };

export function UserStatusPanel({ user }: Props) {
  return (
    <section className={`${styles.panel} ${styles.statusPanel}`} aria-labelledby="user-state-title">
      <h2 id="user-state-title" className={styles.panelHeading}>이용 상태 관리</h2>
      <p>현재 상태 <span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></p>
      <p className={styles.hint}>이용 정지된 회원은 로그인과 회원 서비스를 이용할 수 없습니다. 정지를 해제하면 다시 이용할 수 있습니다.</p>
      <UserStatusForm user={user} />
    </section>
  );
}
