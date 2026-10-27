import type { OrderQuery } from "../_lib/searchParams";
import { ORDER_STATUSES, statusLabels } from "../_lib/types";
import controls from "./order-controls.module.css";
import styles from "../order-dashboard.module.css";

type Props = { query: OrderQuery };
export function OrderFilters({ query }: Props) {
  return <form className={styles.filters} method="get" action="/admin/orders" role="search">
    <input type="hidden" name="view" value={query.view} />
    <label className={controls.field}>주문 검색<input className={controls.input} type="search" name="q"
      defaultValue={query.q} maxLength={100} placeholder="주문번호, 고객명, 메뉴명" /></label>
    <label className={controls.field}>상태<select className={controls.select} name="status" defaultValue={query.status}>
      <option value="">전체</option>{ORDER_STATUSES.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
    </select></label>
    <label className={controls.field}>정렬<select className={controls.select} name="sort" defaultValue={query.sort}>
      <option value="newest">최신순</option><option value="oldest">오래된순</option>
    </select></label>
    <button className={`${controls.button} ${controls.primaryButton}`} type="submit">조회</button>
  </form>;
}
