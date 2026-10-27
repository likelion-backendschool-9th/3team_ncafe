import Link from "next/link";
import type { OrderQuery } from "../_lib/searchParams";
import { orderDetailHref } from "../_lib/searchParams";
import { orderCode, orderDate, orderSummary, won } from "../_lib/format";
import type { AdminOrderResponse, OrderGroup } from "../_lib/types";
import { groupLabels } from "../_lib/types";
import { OrderStatusControl } from "./OrderStatusControl";
import styles from "../order-dashboard.module.css";

type Props = { orders: AdminOrderResponse[]; query: OrderQuery; group: OrderGroup };
export function OrderList({ orders, query, group }: Props) {
  return <div className={styles.tableWrap} role="region" aria-label={`${groupLabels[group]} 주문 목록 표`} tabIndex={0}>
    <table className={styles.table}>
      <thead><tr><th scope="col">주문번호</th><th scope="col">주문일시</th><th scope="col">고객</th>
        <th scope="col">주문 메뉴</th><th scope="col">금액</th><th scope="col">상태</th></tr></thead>
      <tbody>{orders.map(order => <tr key={order.id}>
        <td className={styles.code}><Link className={styles.codeBox} href={orderDetailHref(order.id, query)}>{orderCode(order.id)}</Link></td>
        <td>{orderDate(order.createdAt)}</td><td>{order.customerName}</td><td>{orderSummary(order)}</td><td>{won(order.totalAmount)}</td>
        <td><div className={styles.statusBox}><OrderStatusControl order={order} query={query} /></div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
