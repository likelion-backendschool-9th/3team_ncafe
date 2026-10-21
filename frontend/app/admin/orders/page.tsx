import Link from "next/link";
import { allowedAdminOrderStatuses, mockOrderRepository } from "@/app/_lib/mock/orders";
import { orderStatusLabels, type Order, type OrderStatus } from "@/app/_lib/orders/types";
import { requireRole } from "@/app/_lib/session/session";
import { changeAdminOrderStatus } from "./_actions";
import { OrderSectionAccordion } from "./_components/OrderSectionAccordion";
import { StatusChangeForm } from "./_components/StatusChangeForm";
import controls from "./_components/order-controls.module.css";
import styles from "./order-dashboard.module.css";

type Query = Promise<Record<string, string | string[] | undefined>>;
type SectionKey = "active" | "completed" | "canceled";
const pageSize = 10;
const won = new Intl.NumberFormat("ko-KR");
const orderDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});
const statuses: OrderStatus[] = ["received", "preparing", "ready", "completed", "canceled"];
const progress: OrderStatus[] = ["received", "preparing", "ready", "completed"];

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function orderCode(order: Order): string {
  return order.id.slice(0, 8).toUpperCase();
}

function optionLabel(option: Order["items"][number]["option"]): string {
  return option === "hot" ? "HOT" : option === "ice" ? "ICE" : "옵션 없음";
}

function summary(order: Order): string {
  const first = order.items[0];
  return first ? `${first.menuName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}` : "품목 없음";
}

function detailHref(order: Order, query: string): string {
  return `/admin/orders/${encodeURIComponent(order.id)}${query ? `?${query}` : ""}`;
}

function StatusControls({ order, query }: { order: Order; query: string }) {
  const choices = allowedAdminOrderStatuses(order.status);
  const currentIndex = progress.indexOf(order.status);
  const previous = currentIndex > 0 ? progress[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < progress.length - 1 ? progress[currentIndex + 1] : null;
  const targets = [previous, next, choices.includes("canceled") ? ("canceled" as OrderStatus) : null].filter(
    (status): status is OrderStatus => status !== null,
  );
  if (targets.length === 0) {
    return <span className={`${styles.badge} ${styles[order.status]}`}>{orderStatusLabels[order.status]}</span>;
  }

  return (
    <div className={styles.statusActions} aria-label={`${orderCode(order)} 주문 상태 변경`}>
      <StatusChangeForm
        action={changeAdminOrderStatus.bind(null, order.id, order.status, query)}
        orderCode={orderCode(order)}
        currentLabel={orderStatusLabels[order.status]}
        status={order.status}
        choices={targets.map((target) => ({
          value: target,
          label: target === "canceled" ? "주문 취소" : target === previous ? `이전: ${orderStatusLabels[target]}` : `다음: ${orderStatusLabels[target]}`,
        }))}
      />
    </div>
  );
}

function Receipt({ order, query }: { order: Order; query: string }) {
  return (
    <article className={styles.receipt}>
      <div className={styles.receiptHeader}>
        <div><span className={styles.receiptEyebrow}>SAMDABANG ORDER</span><h3>주문 명세표</h3></div>
        <StatusControls order={order} query={query} />
      </div>
      <dl className={styles.receiptMeta}>
        <div><dt>주문번호</dt><dd title={order.id}>{orderCode(order)}</dd></div>
        <div><dt>주문일시</dt><dd>{orderDate.format(new Date(order.createdAt))}</dd></div>
        <div><dt>주문자</dt><dd>{order.customerName}</dd></div>
      </dl>
      <div className={styles.receiptItems}>
        <div className={styles.receiptItemsHeading}><span>품목</span><span>금액</span></div>
        {order.items.map((item, index) => (
          <div className={styles.receiptItem} key={`${item.menuId}-${item.option}-${index}`}>
            <div><strong>{item.menuName}</strong><small>{optionLabel(item.option)} · {item.quantity}개 × {won.format(item.unitPrice)}원</small></div>
            <strong>{won.format(item.lineTotal)}원</strong>
          </div>
        ))}
      </div>
      <div className={styles.receiptTotal}><span>총 금액</span><strong>{won.format(order.totalAmount)}원</strong></div>
      {order.cancelReason && <p className={styles.receiptCancelReason}><span>취소 사유</span>{order.cancelReason}</p>}
      <Link className={`${controls.linkButton} ${styles.receiptDetailLink}`} href={detailHref(order, query)}>주문 상세보기</Link>
    </article>
  );
}

function OrderSection({
  sectionKey, title, description, orders, view, query, page, href, open,
}: {
  sectionKey: SectionKey;
  title: string;
  description: string;
  orders: Order[];
  view: "list" | "grid";
  query: string;
  page: number;
  href: (changes: Record<string, string>) => string;
  open: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
  const visible = orders.slice((page - 1) * pageSize, page * pageSize);
  const pageKey = `${sectionKey}Page`;

  return (
    <OrderSectionAccordion key={`${sectionKey}-${open}`} title={title} description={description} count={orders.length} tone={sectionKey} defaultOpen={open}>
      {visible.length === 0 ? (
        <p className={styles.sectionEmpty}>이 영역에 표시할 주문이 없습니다.</p>
      ) : view === "grid" ? (
        <div className={styles.receiptGrid}>{visible.map((order) => <Receipt key={order.id} order={order} query={query} />)}</div>
      ) : (
        <div className={styles.tableWrap} role="region" aria-label={`${title} 주문 목록 표`} tabIndex={0}>
          <table className={styles.table}>
            <thead><tr><th scope="col"><span className={styles.codeBox}>주문번호</span></th><th scope="col">주문일시</th><th scope="col">고객</th><th scope="col">주문 메뉴</th><th scope="col">금액</th><th scope="col"><span className={styles.statusBox}>상태</span></th></tr></thead>
            <tbody>{visible.map((order) => <tr key={order.id}>
              <td title={order.id} className={styles.code}><Link className={styles.codeBox} href={detailHref(order, query)}>{orderCode(order)}</Link></td>
              <td>{orderDate.format(new Date(order.createdAt))}</td>
              <td>{order.customerName}</td>
              <td>{summary(order)}</td>
              <td>{won.format(order.totalAmount)}원</td>
              <td><div className={styles.statusBox}><StatusControls order={order} query={query} /></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {orders.length > pageSize && <nav className={styles.pagination} aria-label={`${title} 페이지 이동`}>
        {page > 1 && <Link href={href({ [pageKey]: String(page - 1) })}>이전 페이지</Link>}
        <span>{page} / {pageCount}</span>
        {page < pageCount && <Link href={href({ [pageKey]: String(page + 1) })}>다음 페이지</Link>}
      </nav>}
    </OrderSectionAccordion>
  );
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Query }) {
  await requireRole("admin", "/admin/orders");
  const raw = await searchParams;
  const q = one(raw.q).trim().slice(0, 100);
  const status = statuses.includes(one(raw.status) as OrderStatus) ? one(raw.status) as OrderStatus : "";
  const sort = one(raw.sort) === "oldest" ? "oldest" : "newest";
  const view = one(raw.view) === "grid" ? "grid" : "list";
  const all = await mockOrderRepository.listAll();
  const needle = q.toLocaleLowerCase("ko");
  const filtered = all.filter((order) =>
    (!status || order.status === status) && (!needle ||
      order.id.toLowerCase().includes(needle) ||
      order.customerName.toLocaleLowerCase("ko").includes(needle) ||
      order.items.some((item) => item.menuName.toLocaleLowerCase("ko").includes(needle))),
  );
  if (sort === "oldest") filtered.reverse();
  const groups: Record<SectionKey, Order[]> = {
    active: filtered.filter((order) => order.status !== "completed" && order.status !== "canceled"),
    completed: filtered.filter((order) => order.status === "completed"),
    canceled: filtered.filter((order) => order.status === "canceled"),
  };
  function sectionPage(key: SectionKey): number {
    const requested = Number(one(raw[`${key}Page`]));
    const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
    return Math.min(page, Math.max(1, Math.ceil(groups[key].length / pageSize)));
  }
  const pages = { active: sectionPage("active"), completed: sectionPage("completed"), canceled: sectionPage("canceled") };
  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (status) base.set("status", status);
  if (sort !== "newest") base.set("sort", sort);
  base.set("view", view);
  for (const key of ["active", "completed", "canceled"] as const) {
    if (pages[key] > 1) base.set(`${key}Page`, String(pages[key]));
  }
  const query = base.toString();
  function href(changes: Record<string, string>): string {
    const params = new URLSearchParams(base);
    for (const [key, value] of Object.entries(changes)) params.set(key, value);
    return `/admin/orders?${params.toString()}`;
  }
  const error = one(raw.error);
  const focus = one(raw.focus);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span>/</span><span>주문 관리</span></nav>
      <header className={styles.heading}><p className="eyebrow">주문 관리</p><h1>주문 목록</h1><p>리스트에서 빠르게 처리하고, 그리드에서 주문 명세를 확인하세요.</p></header>

      <section className={styles.summary} aria-label="주문 현황">
        <div><span>전체 주문</span><strong>{all.length}</strong></div>
        <div><span>처리 중</span><strong>{all.filter((order) => order.status !== "completed" && order.status !== "canceled").length}</strong></div>
        <div><span>완료</span><strong>{all.filter((order) => order.status === "completed").length}</strong></div>
        <div><span>취소</span><strong>{all.filter((order) => order.status === "canceled").length}</strong></div>
      </section>

      {one(raw.updated) === "1" && <p className={styles.notice} role="status">주문 상태를 변경했습니다.</p>}
      {error && <p className={styles.error} role="alert">{error === "STALE_STATUS" ? "주문 상태가 이미 변경됐습니다. 현재 상태를 확인해 주세요." : error === "INVALID_STATUS" ? "해당 상태로 변경할 수 없습니다." : error === "NOT_FOUND" ? "주문을 찾을 수 없습니다." : error === "INVALID_INPUT" ? "주문을 취소하려면 취소 사유를 입력해 주세요." : "상태를 변경하지 못했습니다. 다시 시도해 주세요."}</p>}

      <form className={styles.filters} method="get" role="search">
        <input type="hidden" name="view" value={view} />
        <label className={controls.field}>주문 검색<input className={controls.input} type="search" name="q" defaultValue={q} placeholder="주문번호, 고객명, 메뉴명" /></label>
        <label className={controls.field}>상태<select className={controls.select} name="status" defaultValue={status}><option value="">전체</option>{statuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}</select></label>
        <label className={controls.field}>정렬<select className={controls.select} name="sort" defaultValue={sort}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label>
        <button className={`${controls.button} ${controls.primaryButton}`} type="submit">조회</button>
      </form>

      <section className={styles.results} aria-label="주문 조회 결과">
        <div className={styles.resultsHeader}>
          <div><h2>조회 결과</h2><span>총 {filtered.length}건</span></div>
          <div className={styles.viewSwitch} aria-label="보기 방식">
            <Link href={href({ view: "list" })} aria-current={view === "list" ? "page" : undefined}>리스트</Link>
            <Link href={href({ view: "grid" })} aria-current={view === "grid" ? "page" : undefined}>그리드</Link>
          </div>
        </div>
        {(status === "" || ["received", "preparing", "ready"].includes(status)) && <OrderSection sectionKey="active" title="처리 중" description="접수 · 준비 중 · 준비 완료" orders={groups.active} view={view} query={query} page={pages.active} href={href} open />}
        {(status === "" || status === "completed") && <OrderSection sectionKey="completed" title="완료" description="처리가 끝난 주문" orders={groups.completed} view={view} query={query} page={pages.completed} href={href} open={status === "completed" || focus === "completed"} />}
        {(status === "" || status === "canceled") && <OrderSection sectionKey="canceled" title="취소" description="취소된 주문" orders={groups.canceled} view={view} query={query} page={pages.canceled} href={href} open={status === "canceled" || focus === "canceled"} />}
      </section>
    </div>
  );
}
