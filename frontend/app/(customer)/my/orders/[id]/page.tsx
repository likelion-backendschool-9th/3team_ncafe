import Link from "next/link";
import { notFound } from "next/navigation";
import { mockOrderRepository } from "@/app/_lib/mock/orders";
import { orderStatusLabels, orderTypeLabels, paymentMethodLabels } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";
import { cancelCustomerOrder } from "../_actions";
import { CancelOrderForm } from "../_components/CancelOrderForm";
import { optionLabel, orderCode, orderDate, won } from "../_format";
import styles from "../orders.module.css";

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function CustomerOrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const customer = await requireRole("customer", `/my/orders/${encodeURIComponent(id)}`);
  const order = await mockOrderRepository.getByCustomer(id, customer.id);
  if (!order) notFound();
  const query = await searchParams;
  const code = orderCode(order);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/my/orders">주문 목록</Link><span aria-hidden="true">/</span><span>주문 {code}</span>
      </nav>
      <div className={styles.detailTop}>
        <div><p className={styles.eyebrow}>ORDER DETAIL · 주문 상세</p><h1>주문 {code}</h1></div>
        <Link className={styles.backLink} href="/my/orders">← 목록으로</Link>
      </div>

      {one(query.placed) === "1" && <p className={styles.notice} role="status">주문이 접수되었습니다. 결제는 카운터에서 진행해 주세요.</p>}
      {one(query.canceled) === "1" &&<p className={styles.notice} role="status">주문을 취소했습니다.</p>}
      {one(query.error) === "cancel" && <p className={styles.error} role="alert">주문을 취소할 수 없습니다. 현재 주문 상태를 확인해 주세요.</p>}

      <article className={styles.detailSheet}>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.fieldLabel}>주문번호</span>
            <strong className={styles.fullId}>{order.id}</strong>
            <p>주문일시 <time dateTime={order.createdAt}>{orderDate.format(new Date(order.createdAt))}</time></p>
          </div>
          <span className={styles.status} data-status={order.status}>{orderStatusLabels[order.status]}</span>
        </header>

        <section className={styles.itemsSection} aria-labelledby="order-items-title">
          <div className={styles.itemsHeading}><h2 id="order-items-title">주문 품목</h2><span>{order.items.length}종</span></div>
          <ul className={styles.itemList}>
            {order.items.map((item, index) => (
              <li className={styles.item} key={`${item.menuId}-${item.option}-${index}`}>
                <div>
                  <strong>{item.menuName}</strong>
                  <p>{optionLabel(item.option)} · {item.quantity}개 × {won.format(item.unitPrice)}원</p>
                </div>
                <strong>{won.format(item.lineTotal)}원</strong>
              </li>
            ))}
          </ul>
          <div className={styles.total}><span>총 주문 금액</span><strong>{won.format(order.totalAmount)}원</strong></div>
        </section>

        {order.orderType && (
          <dl className={styles.checkoutInfo}>
            <div><dt>수령 방식</dt><dd>{orderTypeLabels[order.orderType]}</dd></div>
            {order.paymentMethod && <div><dt>결제 수단</dt><dd>{paymentMethodLabels[order.paymentMethod]} (카운터 결제)</dd></div>}
            <div><dt>요청사항</dt><dd>{order.request || "없음"}</dd></div>
          </dl>
        )}

        <footer className={styles.detailFooter}>
          <p>최근 상태 변경 <time dateTime={order.updatedAt}>{orderDate.format(new Date(order.updatedAt))}</time></p>
          {order.status === "received" && <CancelOrderForm action={cancelCustomerOrder.bind(null, order.id)} orderCode={code} />}
        </footer>
      </article>
    </div>
  );
}
