// 주문 내역 — 기간 버튼(1·3·6·12개월) + 주문 카드(m3-card › m3-list › card-actions). 데이터는 lib/mock 의 ORDERS (모양 = GET /api/my/orders).
import { Fragment } from "react";
import Link from "next/link";
import { ORDERS } from "@/lib/mock";
import { dateTime, image, optionSummary, ORDER_STATUS, won } from "@/lib/format";

const PERIODS = [
  { months: 1, label: "1개월" },
  { months: 3, label: "3개월" },
  { months: 6, label: "6개월" },
  { months: 12, label: "1년" },
];

export default function MyOrdersPage() {
  return (
    <>
      {/* ----- 기간 필터: m3-toolbar toolbar:fill (필터 바) ----- */}
      <form className="m3-toolbar toolbar:fill" aria-label="기간 필터">
        {PERIODS.map((p, i) => (
          <Link
            key={p.months}
            href={`/my/orders?months=${p.months}`}
            className={i === 0 ? "m3-btn btn-size:xs" : "m3-btn btn:outlined btn-size:xs"}
            aria-current={i === 0 ? "page" : undefined}
          >
            {p.label}
          </Link>
        ))}
        <div className="m3-text-field field:outlined field-label:none width:ex" style={{ "--width-ex": "10rem" }}>
          <input type="date" name="from" defaultValue="2026-08-16" aria-label="시작일" />
        </div>
        <span aria-hidden="true">~</span>
        <div className="m3-text-field field:outlined field-label:none width:ex" style={{ "--width-ex": "10rem" }}>
          <input type="date" name="to" defaultValue="2026-09-16" aria-label="종료일" />
        </div>
        <button type="submit" className="m3-btn">
          조회
        </button>
      </form>

      {/* ----- 주문 목록: m3-grid grid-cols:1 + m3-card(card-header · m3-list · card-actions) ----- */}
      <ul className="m3-grid grid-cols:1 grid-gap:3">
        {ORDERS.map((order) => {
          const status = ORDER_STATUS[order.status];
          return (
            <li key={order.orderNo} className="m3-card card:outlined card-size:compact">
              <div className="card-header">
                <div className="card-titles">
                  <h2 className="card-headline">{dateTime(order.createdAt)}</h2>
                  <p className="card-subhead">주문번호 {order.orderNo}</p>
                </div>
                <span className={`m3-badge badge:inline badge-color:${status.color}`}>{status.label}</span>
              </div>

              <ul className="m3-list">
                {order.items.map((item, i) => (
                  <Fragment key={`${item.menuId}-${i}`}>
                    {i > 0 && <li className="list-divider list-divider:inset" role="separator" />}
                    <li className="list-item">
                      <span className="list-avatar">
                        <img src={image(item.imgSrc, item.slug)} alt="" />
                      </span>
                      <div className="list-content">
                        <Link href={`/menus/${item.slug}`} className="list-headline hover:text-decoration:underline">
                          {item.menuName}
                        </Link>
                        <p className="list-supporting">{optionSummary(item.temperature, item.size, item.quantity)}</p>
                      </div>
                      <span className="flex-shrink:0 font-size:body-sm font-weight:semibold">{won(item.price)}원</span>
                    </li>
                  </Fragment>
                ))}
              </ul>

              <div className="card-actions flex-wrap:wrap">
                <p className="font-size:body-sm color:text-muted">
                  결제 금액 <strong className="margin-left:2 font-size:body-lg color:text">{won(order.total)}원</strong>
                </p>
                <div className="card-actions-end">
                  <button type="button" className="m3-btn btn:outlined btn-size:xs">
                    주문 상세
                  </button>
                  {order.status === "waiting" && (
                    <button type="button" className="m3-btn btn:outlined btn-color:danger btn-size:xs">
                      주문 취소
                    </button>
                  )}
                  {order.status === "done" && (
                    <button type="button" className="m3-btn btn-size:xs">
                      재주문
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ----- 페이지 이동: m3-pager ----- */}
      <nav className="m3-pager margin-top:9" aria-label="페이지 이동">
        <Link href="/my/orders?page=1" className="pager-item pager-prev" aria-disabled="true" tabIndex={-1}>
          이전
        </Link>
        <Link href="/my/orders?page=1" className="pager-item" aria-current="page">
          1
        </Link>
        <Link href="/my/orders?page=2" className="pager-item">
          2
        </Link>
        <Link href="/my/orders?page=2" className="pager-item pager-next">
          다음
        </Link>
      </nav>
    </>
  );
}
