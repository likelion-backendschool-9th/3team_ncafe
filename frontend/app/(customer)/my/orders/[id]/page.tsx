import Link from "next/link";
import { notFound } from "next/navigation";
import {
  customerOrderStatusLabels,
  customerOrderTypeLabels,
  customerPaymentMethodLabels,
} from "../_lib/types";
import { requireRole } from "@/app/_lib/session/session";
import { getCustomerOrder } from "../_lib/api";
import { optionLabel, orderCode, orderDate, won } from "../_format";
import styles from "../orders.module.css";

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function isOrderId(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

export default async function CustomerOrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole("customer", `/my/orders/${encodeURIComponent(id)}`);
  if (!isOrderId(id)) notFound();
  const order = await getCustomerOrder(id);
  if (!order) notFound();
  const query = await searchParams;
  const code = orderCode(order);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/my/orders">내 주문 목록</Link><span aria-hidden="true">/</span><span>주문 {code}</span>
      </nav>
      <div className={styles.detailTop}>
        <div><p className={styles.eyebrow}>ORDER DETAIL · 주문 상세</p><h1>주문 {code}</h1></div>
        <Link className={styles.backLink} href="/my/orders">목록으로</Link>
      </div>

      {one(query.placed) === "1" && <p className={styles.notice} role="status">주문이 접수되었습니다. 결제는 카운터에서 진행해 주세요.</p>}

      <article className={styles.detailSheet}>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.fieldLabel}>주문 번호</span>
            <strong className={styles.fullId}>{order.id}</strong>
            <p>주문일시 <time dateTime={order.createdAt}>{orderDate.format(new Date(order.createdAt))}</time></p>
          </div>
          <span className={styles.status} data-status={order.status}>{customerOrderStatusLabels[order.status]}</span>
        </header>

        <section className={styles.itemsSection} aria-labelledby="order-items-title">
          <div className={styles.itemsHeading}><h2 id="order-items-title">주문 품목</h2><span>{order.items.length}종</span></div>
          <ul className={styles.itemList}>
            {order.items.map((item) => (
              <li className={styles.item} key={`${item.menuId}-${item.temperature ?? "none"}`}>
                <div>
                  <strong>{item.menuName}</strong>
                  <p>{optionLabel(item.temperature)} · {item.quantity}개 × {won.format(item.unitPrice)}원</p>
                </div>
                <strong>{won.format(item.lineTotal)}원</strong>
              </li>
            ))}
          </ul>
          <div className={styles.total}><span>총 주문 금액</span><strong>{won.format(order.totalAmount)}원</strong></div>
        </section>

        <dl className={styles.checkoutInfo}>
          <div><dt>수령 방식</dt><dd>{customerOrderTypeLabels[order.orderType]}</dd></div>
          <div><dt>카운터 결제수단</dt><dd>{customerPaymentMethodLabels[order.paymentMethod]}</dd></div>
          <div><dt>요청사항</dt><dd>{order.request || "없음"}</dd></div>
        </dl>
        <footer className={styles.detailFooter}>
          <p>주문 상태는 매장에서 처리 후 갱신됩니다.</p>
        </footer>
      </article>
    </div>
  );
}
