import Link from "next/link";
import { orderCode, orderDate, temperatureLabel, won } from "../_lib/format";
import { orderDetailHref, type OrderQuery } from "../_lib/searchParams";
import type { AdminOrderResponse } from "../_lib/types";
import { OrderStatusControl } from "./OrderStatusControl";
import styles from "../order-dashboard.module.css";
import controls from "./order-controls.module.css";

type Props = { order: AdminOrderResponse; query: OrderQuery };
export function OrderReceipt({ order, query }: Props) {
  return <article className={styles.receipt} aria-label={`주문 ${orderCode(order.id)} 명세표`}>
    <div className={styles.receiptHeader}>
      <div><span className={styles.receiptEyebrow}>SAMDABANG ORDER</span><h3>주문 명세표</h3></div>
      <OrderStatusControl order={order} query={query} />
    </div>
    <dl className={styles.receiptMeta}>
      <div><dt>주문번호</dt><dd>{orderCode(order.id)}</dd></div>
      <div><dt>주문일시</dt><dd>{orderDate(order.createdAt)}</dd></div>
      <div><dt>주문자</dt><dd>{order.customerName}</dd></div>
    </dl>
    <div className={styles.receiptItems}>
      <div className={styles.receiptItemsHeading}><span>품목</span><span>금액</span></div>
      {order.items.map(item => <div className={styles.receiptItem} key={item.id}>
        <div><strong>{item.menuName}</strong><small>{temperatureLabel(item.temperature)} · {item.quantity}개 × {won(item.unitPrice)}</small></div>
        <strong>{won(item.lineTotal)}</strong>
      </div>)}
    </div>
    <div className={styles.receiptTotal}><span>총 금액</span><strong>{won(order.totalAmount)}</strong></div>
    <Link className={`${controls.linkButton} ${styles.receiptDetailLink}`} href={orderDetailHref(order.id, query)}>주문 상세보기</Link>
  </article>;
}
