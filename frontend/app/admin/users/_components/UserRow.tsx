import Link from "next/link";
import { roleLabels, statusLabels, type UserResponse } from "../_lib/user";
import { UserStatusForm } from "./UserStatusForm";
import styles from "../users.module.css";

type Props = { user: UserResponse; query: string };

export function UserRow({ user, query }: Props) {
  const detailHref = `/admin/users/${user.id}${query}`;

  return (
    <tr>
      <td><div className={styles.person}><span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1)}</span><Link className={styles.memberName} href={detailHref}>{user.name}</Link></div></td>
      <td>{user.email}</td>
      <td><span className={user.role === "admin" ? `${styles.badge} ${styles.admin}` : styles.badge}>{roleLabels[user.role]}</span></td>
      <td><span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></td>
      <td><div className={styles.rowActions}><Link className={styles.outlineButton} href={detailHref}>상세 보기</Link><UserStatusForm user={user} compact /></div></td>
    </tr>
  );
}
