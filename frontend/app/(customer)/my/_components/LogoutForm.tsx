import { logout } from "@/app/_lib/session/logout";
import styles from "../mypage.module.css";

export function LogoutForm() {
  return (
    <form action={logout} className={styles.logout}>
      <button type="submit" className={styles.logoutButton}>
        로그아웃
      </button>
    </form>
  );
}
