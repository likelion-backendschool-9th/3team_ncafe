import Link from "next/link";
import { menuListQuery, type MenuListQuery } from "../_lib/searchParams";
import styles from "../menus.module.css";

type Props = { query: MenuListQuery; page: number; totalPages: number };

export function MenuPagination({ query, page, totalPages }: Props) {
  return (
    <nav className={styles.pagination} aria-label="메뉴 목록 페이지 이동">
      {page > 1 ? <Link className={styles.editButton} href={`/admin/menus${menuListQuery(query, page - 1)}`}>← 이전</Link> : <span>← 이전</span>}
      <span aria-current="page">{page} / {totalPages}</span>
      {page < totalPages ? <Link className={styles.editButton} href={`/admin/menus${menuListQuery(query, page + 1)}`}>다음 →</Link> : <span>다음 →</span>}
    </nav>
  );
}
