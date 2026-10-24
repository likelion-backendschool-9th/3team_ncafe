import Link from "next/link";
import { userListQuery, type UserListQuery } from "../_lib/searchParams";
import styles from "../users.module.css";

type Props = { query: UserListQuery; page: number; totalPages: number };

export function UserPagination({ query, page, totalPages }: Props) {
  return (
    <nav className={styles.pagination} aria-label="회원 목록 페이지 이동">
      {page > 1 ? <Link className={styles.outlineButton} href={`/admin/users${userListQuery(query, page - 1)}`}>← 이전</Link> : <span className={styles.secondary}>← 이전</span>}
      <span aria-current="page">{page} / {totalPages}</span>
      {page < totalPages ? <Link className={styles.outlineButton} href={`/admin/users${userListQuery(query, page + 1)}`}>다음 →</Link> : <span className={styles.secondary}>다음 →</span>}
    </nav>
  );
}
