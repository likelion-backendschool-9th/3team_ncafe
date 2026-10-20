import Link from "next/link";
import { mockOrderRepository } from "@/app/_lib/mock/orders";
import { orderStatusLabels, type Order } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";
import { orderCode, orderDate, orderSummary, won } from "./_format";
import styles from "./orders.module.css";

function OrderSection({ title, description, orders }: {
  title: string;
  description: string;
  orders: Order[];
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div><h2>{title}</h2><p>{description}</p></div>
        <span className={styles.count}>{orders.length}건</span>
      </div>
      {orders.length === 0 ? <p className={styles.sectionEmpty}>표시할 주문이 없습니다.</p> : (
        <ul className={styles.orderList}>
          {orders.map((order) => (
            <li key={order.id}>
              <article className={styles.orderCard}>
                <div className={styles.cardTop}>
                  <div>
                    <strong className={styles.code} title={order.id}>주문 {orderCode(order)}</strong>
                    <time dateTime={order.createdAt}>{orderDate.format(new Date(order.createdAt))}</time>
                  </div>
                  <span className={styles.status} data-status={order.status}>{orderStatusLabels[order.status]}</span>
                </div>
                <div className={styles.cardBody}>
                  <div><span className={styles.fieldLabel}>주문 메뉴</span><strong>{orderSummary(order)}</strong></div>
                  <div><span className={styles.fieldLabel}>총 주문 금액</span><strong>{won.format(order.totalAmount)}원</strong></div>
                </div>
                <Link className={styles.detailLink} href={`/my/orders/${encodeURIComponent(order.id)}`}>주문 상세보기 <span aria-hidden="true">→</span></Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function CustomerOrdersPage() {
  const customer = await requireRole("customer", "/my/orders");
  const orders = await mockOrderRepository.listByCustomer(customer.id);
  const active = orders.filter((order) => order.status !== "completed" && order.status !== "canceled");
  const past = orders.filter((order) => order.status === "completed" || order.status === "canceled");

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>MY ORDERS · 주문 조회</p>
        <h1>내 주문 목록</h1>
        <p>주문 현황과 지난 주문을 확인하세요.</p>
      </header>
      {orders.length === 0 ? (
        <div className={styles.empty}>
          <h2>아직 주문이 없습니다</h2>
          <p>메뉴를 둘러보고 첫 주문을 시작해 보세요.</p>
          <Link href="/menus">메뉴 보러 가기</Link>
        </div>
      ) : <>
        <OrderSection title="진행 중인 주문" description="접수부터 준비 완료까지" orders={active} />
        <OrderSection title="지난 주문" description="완료되거나 취소된 주문" orders={past} />
      </>}
    </div>
  );
}
