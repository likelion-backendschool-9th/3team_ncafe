// 관리자 대시보드 — 통계 카드(m3-grid + StatCard) · 최근 주문(m3-card + m3-table) · 인기 메뉴(m3-list + m3-progress) · 바로 가기.
// 데이터는 lib/mock 의 DASHBOARD (모양 = GET /api/admin/dashboard).
import Link from "next/link";
import StatCard, { type Stat } from "./_components/StatCard";
import { DASHBOARD } from "@/lib/mock";
import { ORDER_STATUS, won } from "@/lib/format";

const QUICK = [
  { href: "/admin/menus/list", icon: "description", name: "메뉴 목록 관리" },
  { href: "/admin/menus/create", icon: "add", name: "새 메뉴 등록" },
  { href: "/", icon: "home", name: "사용자 사이트 보기" },
];

export default function AdminDashboardPage() {
  const d = DASHBOARD;
  const stats: Stat[] = [
    { label: "오늘 주문", value: `${d.todayOrders}건` },
    { label: "오늘 매출", value: `${won(d.todaySales)}원` },
    { label: "제조 대기", value: `${d.preparing}건`, delta: "제조 중 상태의 주문" },
    { label: "신규 회원", value: `${d.newMembersThisWeek}명`, delta: "최근 7일" },
  ];

  return (
    <>
      <div className="display:flex align-items:flex-end justify-content:space-between flex-wrap:wrap gap:4 margin-bottom:7">
        <div>
          <h1 className="font-size:heading-md font-weight:bold letter-spacing:tight">대시보드</h1>
          <p className="margin-top:2 font-size:body-sm color:text-muted">
            판매 중 {d.menusOn} · 품절 {d.menusSoldout} · 비공개 {d.menusHidden}
          </p>
        </div>
        <Link href="/admin/menus/create" className="m3-btn btn-icon:leading">
          <i className="m3-icon icon:add" aria-hidden="true"></i>
          메뉴 등록
        </Link>
      </div>

      <ul className="m3-grid grid-cols:4 grid-gap:3 margin-bottom:7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </ul>

      <div
        className="display:grid grid-template-columns:1 gap:5 md:grid-template-columns:ex align-items:start"
        style={{ "--grid-template-columns-ex": "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <section className="m3-card card:outlined" aria-labelledby="recent-orders">
          <div className="m3-toolbar toolbar:card">
            <h2 id="recent-orders" className="toolbar-start font-size:body-lg font-weight:semibold">
              최근 주문
            </h2>
          </div>
          <table className="m3-table">
            <thead>
              <tr>
                <th scope="col">주문번호</th>
                <th scope="col">고객</th>
                <th scope="col">메뉴</th>
                <th scope="col" className="table-align:end">
                  금액
                </th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.orderNo}>
                  <td className="color:text-muted">{o.orderNo}</td>
                  <td>{o.customer}</td>
                  <td>{o.summary}</td>
                  <td className="table-align:end">{won(o.total)}원</td>
                  <td>
                    <span className={`m3-badge badge:inline badge-color:${ORDER_STATUS[o.status].color}`}>
                      {ORDER_STATUS[o.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="display:flex flex-direction:column gap:5">
          <section className="m3-card card:outlined card-padding:self" aria-labelledby="rank-title">
            <h2 id="rank-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              인기 메뉴
            </h2>
            <ol className="m3-list list-size:compact">
              {d.ranks.map((r, i) => (
                <li key={r.menuId} className="list-item">
                  <span className="list-leading font-weight:bold color:text-muted">{i + 1}</span>
                  <div className="list-content">
                    <span className="list-headline">{r.name}</span>
                    <div className="m3-progress margin-top:1" style={{ "--progress-value": `${r.ratio}%` }}></div>
                  </div>
                  <span className="list-trailing">{r.count}개</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="m3-card card:outlined card-padding:self" aria-labelledby="quick-title">
            <h2 id="quick-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              바로 가기
            </h2>
            <ul className="m3-list list-size:compact">
              {QUICK.map((q) => (
                <li key={q.name}>
                  <Link href={q.href} className="list-item">
                    <i className={`m3-icon list-leading icon:${q.icon}`} aria-hidden="true"></i>
                    <span className="list-content">{q.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
