import type { AdminOrderResponse } from "../../_lib/types";
import { orderDate } from "../../_lib/format";
import styles from "../order-detail-view.module.css";

type Props = { order: AdminOrderResponse };
export function OrderMeta({ order }: Props) {
  return <footer className={styles.footer}>
    {order.status === "canceled" && <div className={styles.cancelReason}>
      <h2>주문 취소 사유</h2><p>{order.cancelReason ?? "등록된 취소 사유가 없습니다."}</p>
    </div>}
    <dl>
    <div><dt>고객</dt><dd>{order.customerName}</dd></div>
    <div><dt>수령 방식</dt><dd>{order.orderType === "dine-in" ? "매장 식사" : "포장"}</dd></div>
    <div><dt>카운터 결제수단</dt><dd>{order.paymentMethod === "card" ? "카드" : "현금"}</dd></div>
    {order.request && <div><dt>요청사항</dt><dd>{order.request}</dd></div>}
    <div><dt>최근 수정</dt><dd>{orderDate(order.updatedAt)}</dd></div>
  </dl></footer>;
}
