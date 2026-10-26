import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/app/_lib/session/session";
import { ApiRequestError } from "@/app/_lib/api/backend-session";
import { getAdminOrders } from "./_lib/api";
import { loadOrderDashboard } from "./_lib/queries";
import { orderListHref, parseOrderFlash, parseOrderSearchParams, serializeOrderQuery, type RawOrderQuery } from "./_lib/searchParams";
import { OrderSummary } from "./_components/OrderSummary";
import { OrderFilters } from "./_components/OrderFilters";
import { OrderFeedback } from "./_components/OrderFeedback";
import { OrderSection } from "./_components/OrderSection";
import styles from "./order-dashboard.module.css";

export const metadata: Metadata = { title: "주문 관리", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<RawOrderQuery> };
export default async function AdminOrdersPage({ searchParams }: Props) {
  const raw = await searchParams;
  const requested = parseOrderSearchParams(raw);
  await requireRole("admin", orderListHref(requested));
  let dashboard;
  try {
    dashboard = await loadOrderDashboard(requested, getAdminOrders);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) redirect(`/login?next=${encodeURIComponent(orderListHref(requested))}`);
    if (error instanceof ApiRequestError && error.status === 403) redirect("/forbidden");
    throw error;
  }
  const { counts, sections, query, filteredCount } = dashboard;
  const flash = parseOrderFlash(raw);

  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><span aria-current="page">주문 관리</span></nav>
    <header className={styles.heading}><p className="eyebrow">주문 관리</p><h1>주문 목록</h1><p>리스트에서 빠르게 처리하고, 그리드에서 주문 명세를 확인하세요.</p></header>
    <OrderSummary counts={counts} />
    <OrderFeedback flash={flash} />
    <OrderFilters key={`filters-${serializeOrderQuery(query)}`} query={query} />
    <section className={styles.results} aria-label="주문 조회 결과">
      <div className={styles.resultsHeader}>
        <div><h2>조회 결과</h2><span>총 {filteredCount}건</span></div>
        <div className={styles.viewSwitch} aria-label="보기 방식">
          <Link href={orderListHref({ ...query, view: "list" })} aria-current={query.view === "list" ? "page" : undefined}>리스트</Link>
          <Link href={orderListHref({ ...query, view: "grid" })} aria-current={query.view === "grid" ? "page" : undefined}>그리드</Link>
        </div>
      </div>
      {sections.map(section => <OrderSection key={`section-${section.group}`} section={section} query={query} focus={flash.focus} />)}
    </section>
  </div>;
}
