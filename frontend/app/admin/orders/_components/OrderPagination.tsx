import Link from "next/link";
import { orderListHref, type OrderQuery } from "../_lib/searchParams";
import { groupLabels, type OrderGroup } from "../_lib/types";
import styles from "../order-dashboard.module.css";

type Props = { group: OrderGroup; page: number; totalPages: number; query: OrderQuery };
export function OrderPagination({ group, page, totalPages, query }: Props) {
  if (totalPages <= 1) return null;
  const href = (number: number) => orderListHref({ ...query, pages: { ...query.pages, [group]: number } });
  return <nav className={styles.pagination} aria-label={`${groupLabels[group]} 페이지 이동`}>
    {page > 1 && <Link href={href(page - 1)}>이전 페이지</Link>}
    <span>{page} / {totalPages}</span>
    {page < totalPages && <Link href={href(page + 1)}>다음 페이지</Link>}
  </nav>;
}
