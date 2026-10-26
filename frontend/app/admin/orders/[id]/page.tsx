import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/app/_lib/session/session";
import { ApiRequestError } from "@/app/_lib/api/backend-session";
import { getAdminOrder } from "../_lib/api";
import { orderCode, orderDate } from "../_lib/format";
import { orderDetailHref, orderListHref, parseOrderFlash, parseOrderId, parseOrderSearchParams, type RawOrderQuery } from "../_lib/searchParams";
import { OrderFeedback } from "../_components/OrderFeedback";
import { OrderStatusControl } from "../_components/OrderStatusControl";
import { OrderItems } from "./_components/OrderItems";
import { OrderMeta } from "./_components/OrderMeta";
import styles from "./order-detail-view.module.css";

export const metadata: Metadata = { title: "주문 상세", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawOrderQuery> };
export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const raw = await searchParams;
  const query = parseOrderSearchParams(raw);
  const id = parseOrderId((await params).id);
  const path = id === null ? orderListHref(query) : orderDetailHref(id, query);
  await requireRole("admin", path);
  if (id === null) notFound();
  let order;
  try {
    order = await getAdminOrder(id);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) redirect(`/login?next=${encodeURIComponent(path)}`);
    if (error instanceof ApiRequestError && error.status === 403) redirect("/forbidden");
    throw error;
  }
  if (!order) notFound();
  const listHref = orderListHref(query);
  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="현재 위치">
      <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><Link href={listHref}>주문 목록</Link>
      <span aria-hidden="true">/</span><span aria-current="page">{orderCode(order.id)}</span>
    </nav>
    <div className={styles.topBar}><p className="eyebrow">주문 상세</p><Link className={styles.backLink} href={listHref}>← 주문 목록으로</Link></div>
    <OrderFeedback flash={parseOrderFlash(raw)} />
    <article className={styles.sheet}>
      <header className={styles.orderHeader}>
        <div><p className={styles.kicker}>ORDER</p><h1>주문 {orderCode(order.id)}</h1>
          <p className={styles.orderDate}>주문일시 {orderDate(order.createdAt)}</p><p className={styles.orderId}>주문번호 {order.id}</p>
        </div>
        <div className={styles.statusPanel}><OrderStatusControl order={order} query={query} detail /></div>
      </header>
      <OrderItems order={order} />
      <OrderMeta order={order} />
    </article>
  </div>;
}
