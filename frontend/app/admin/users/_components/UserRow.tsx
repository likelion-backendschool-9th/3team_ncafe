import Link from "next/link";
import { roleLabels, statusLabels, type UserResponse } from "../_lib/user";
import { UserStatusForm } from "./UserStatusForm";
import styles from "../users.module.css";

type Props = { user: UserResponse; query: string };

export function UserRow({ user, query }: Props) {
  const detailHref = `/admin/users/${user.id}${query}`;
  // 아이디와 도메인을 각각 묶어 줄이 바뀔 때 @ 뒤에서 먼저 나뉘게 한다.
  const at = user.email.lastIndexOf("@");

  return (
    <tr>
      <td><Link className={styles.memberName} href={detailHref}>{user.name}</Link></td>
      <td className={styles.email}>{at > 0 ? <><span>{user.email.slice(0, at + 1)}</span><wbr /><span>{user.email.slice(at + 1)}</span></> : user.email}</td>
      <td><span className={user.role === "admin" ? `${styles.badge} ${styles.admin}` : styles.badge}>{roleLabels[user.role]}</span></td>
      <td><span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></td>
      <td><div className={styles.rowActions}><Link className={styles.outlineButton} href={detailHref}>상세 보기</Link><UserStatusForm user={user} compact /></div></td>
    </tr>
  );
}
