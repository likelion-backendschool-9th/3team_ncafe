import Link from "next/link";
import { notFound } from "next/navigation";
import { allowedAdminOrderStatuses, mockOrderRepository } from "@/app/_lib/mock/orders";
import { orderStatusLabels, type OrderItem } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";
import { changeAdminOrderStatusFromDetail } from "../_actions";
import { StatusChangeForm } from "../_components/StatusChangeForm";
import controls from "../_components/order-controls.module.css";
import styles from "./order-detail-view.module.css";

const won = new Intl.NumberFormat("ko-KR");
const orderDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
const listKeys = ["q", "status", "sort", "view", "activePage", "completedPage", "canceledPage"] as const;
const progress = ["received", "preparing", "ready", "completed"] as const;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function optionLabel(option: OrderItem["option"]): string {
  return option === "hot" ? "HOT" : option === "ice" ? "ICE" : "옵션 없음";
}

export default async function AdminOrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole("admin", `/admin/orders/${encodeURIComponent(id)}`);
  const order = await mockOrderRepository.get(id);
  if (!order) notFound();

  const raw = await searchParams;
  const listQuery = new URLSearchParams();
  for (const key of listKeys) {
    const value = one(raw[key]);
    if (value) listQuery.set(key, value);
  }
  const listHref = `/admin/orders${listQuery.size ? `?${listQuery}` : ""}`;
  const code = order.id.slice(0, 8).toUpperCase();
  const status = order.status;
  const statusIndex = progress.findIndex((item) => item === status);
  const choices = allowedAdminOrderStatuses(status).map((target) => ({
    value: target,
    label: target === "canceled" ? "주문 취소" : progress.findIndex((item) => item === target) < statusIndex
      ? `이전: ${orderStatusLabels[target]}` : `다음: ${orderStatusLabels[target]}`,
  }));

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span>
        <Link href={listHref}>주문 목록</Link><span aria-hidden="true">/</span><span>{code}</span>
      </nav>

      <div className={styles.topBar}>
        <p className="eyebrow">주문 상세</p>
        <Link className={styles.backLink} href={listHref}>← 주문 목록으로</Link>
      </div>

      {one(raw.updated) === "1" && <p className={styles.notice} role="status">주문 상태를 변경했습니다.</p>}
      {one(raw.error) && <p className={styles.error} role="alert">{one(raw.error) === "STALE_STATUS" ? "주문 상태가 이미 변경됐습니다. 현재 상태를 확인해 주세요." : one(raw.error) === "INVALID_STATUS" ? "해당 상태로 변경할 수 없습니다." : "상태를 변경하지 못했습니다. 다시 시도해 주세요."}</p>}

      <article className={styles.sheet}>
        <header className={styles.orderHeader}>
          <div>
            <p className={styles.kicker}>ORDER</p>
            <h1>주문 {code}</h1>
            <p className={styles.orderDate}>주문일시 {orderDate.format(new Date(order.createdAt))}</p>
            <p className={styles.orderId}>주문번호 {order.id}</p>
          </div>
          <div className={styles.statusPanel}>
            {choices.length > 0 ? <StatusChangeForm
              action={changeAdminOrderStatusFromDetail.bind(null, order.id, status, listQuery.toString())}
              orderCode={code}
              currentLabel={orderStatusLabels[status]}
              status={status}
              choices={choices}
            /> : <select className={controls.select} defaultValue={status} disabled aria-label={`${code} 주문 상태`}>
              <option value={status}>{orderStatusLabels[status]}</option>
            </select>}
          </div>
        </header>

        <section className={styles.items} aria-labelledby="order-items-title">
          <div className={styles.sectionHeading}>
            <h2 id="order-items-title">주문 품목</h2>
            <span>{order.items.length}종</span>
          </div>
          <ul className={styles.itemList}>
            {order.items.map((item, index) => (
              <li className={styles.item} key={`${item.menuId}-${item.option}-${index}`}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}><strong>{item.menuName}</strong><span>{optionLabel(item.option)}</span></div>
                  <p>수량 {item.quantity}개 <span aria-hidden="true">×</span> 단가 {won.format(item.unitPrice)}원</p>
                </div>
                <strong className={styles.itemAmount}>{won.format(item.lineTotal)}원</strong>
              </li>
            ))}
          </ul>
          <div className={styles.total}><span>총 주문 금액</span><strong>{won.format(order.totalAmount)}원</strong></div>
        </section>

        <footer className={styles.footer}>
          <dl>
            <div><dt>고객</dt><dd>{order.customerName}</dd></div>
            <div><dt>최근 수정</dt><dd>{orderDate.format(new Date(order.updatedAt))}</dd></div>
          </dl>
        </footer>
      </article>
    </div>
  );
}
