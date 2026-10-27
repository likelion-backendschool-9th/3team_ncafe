import type { OrderSectionResult } from "../_lib/queries";
import type { OrderQuery, OrderFlash } from "../_lib/searchParams";
import { groupLabels } from "../_lib/types";
import { OrderSectionAccordion } from "./OrderSectionAccordion";
import { OrderList } from "./OrderList";
import { OrderReceipt } from "./OrderReceipt";
import { OrderPagination } from "./OrderPagination";
import styles from "../order-dashboard.module.css";

type Props = { section: OrderSectionResult; query: OrderQuery; focus: OrderFlash["focus"] };
export function OrderSection({ section: { group, data, page }, query, focus }: Props) {
  const open = group === "active" || query.status === group || focus === group;
  const description = { active: "접수 · 준비 중 · 준비 완료", completed: "처리가 끝난 주문", canceled: "취소된 주문" }[group];
  return <OrderSectionAccordion key={`${group}-${open}`} title={groupLabels[group]} description={description}
    count={data.totalElements} tone={group} defaultOpen={open}>
    {!data.items.length ? <p className={styles.sectionEmpty}>이 영역에 표시할 주문이 없습니다.</p>
      : query.view === "grid" ? <div className={styles.receiptGrid}>{data.items.map(order =>
        <OrderReceipt key={order.id} order={order} query={query} />)}</div>
        : <OrderList orders={data.items} query={query} group={group} />}
    <OrderPagination group={group} page={page} totalPages={data.totalPages} query={query} />
  </OrderSectionAccordion>;
}
