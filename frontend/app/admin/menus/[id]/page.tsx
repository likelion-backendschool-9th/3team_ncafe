// 메뉴 상세 — 방(m3-layout)은 app/admin/layout.tsx 가 그린다. 여기는 layout-content 안:
// 브레드크럼 · 머리(제목·상태·동작) · 2단(기본 정보/판매 설정/통계 표 = m3-table table:key-value · 이미지/이력 = m3-list).
// 데이터는 lib/mock 의 ADMIN_MENU_DETAIL (모양 = GET /api/admin/menus/{id}). 어느 id 로 와도 카페라떼를 보여준다.
import Link from "next/link";
import StatCard, { type Stat } from "../../_components/StatCard";
import { ADMIN_MENU_DETAIL } from "@/lib/mock";
import { date, dateTime, image, MENU_STATUS, won } from "@/lib/format";

export default function AdminMenuDetailPage() {
  const { menu, stats, history } = ADMIN_MENU_DETAIL;
  const status = MENU_STATUS[menu.status];
  const cards: Stat[] = [
    { label: "누적 주문", value: won(stats.orderCount) },
    { label: "이번 주 주문", value: won(stats.weekOrderCount) },
    { label: "좋아요", value: won(stats.favoriteCount) },
    { label: "장바구니 담김", value: won(stats.basketCount) },
  ];
  const options = menu.options.map((o) => (o.extraPrice ? `${o.name} +${won(o.extraPrice)}원` : o.name));

  return (
    <>
      <nav className="m3-breadcrumb breadcrumb-size:sm" aria-label="현재 위치">
        <span>메뉴 관리</span>
        <Link href="/admin/menus/list">메뉴 목록</Link>
        <span aria-current="page">{menu.korName}</span>
      </nav>

      <div className="display:flex align-items:flex-end justify-content:space-between flex-wrap:wrap gap:4 margin-bottom:7">
        <div>
          <div className="display:flex align-items:center gap:3">
            <h1 className="font-size:heading-md font-weight:bold letter-spacing:tight">{menu.korName}</h1>
            <span className={`m3-badge badge:inline badge-color:${status.color}`}>{status.label}</span>
          </div>
          <p className="margin-top:2 font-size:body-sm color:text-muted">
            메뉴 번호 #{menu.id} · {date(menu.createdAt)} 등록
          </p>
        </div>
        <div className="display:flex gap:2">
          <Link href="/admin/menus/list" className="m3-btn btn:outlined">
            목록으로
          </Link>
          <Link href={`/admin/menus/${menu.id}/edit`} className="m3-btn">
            수정
          </Link>
          <button type="button" className="m3-btn btn:outlined btn-color:danger">
            삭제
          </button>
        </div>
      </div>

      <div
        className="display:grid grid-template-columns:1 gap:5 md:grid-template-columns:ex align-items:start"
        style={{ "--grid-template-columns-ex": "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="display:flex flex-direction:column gap:5">
          <section className="m3-card card:outlined card-padding:self" aria-labelledby="basic-title">
            <h2 id="basic-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              기본 정보
            </h2>
            <table className="m3-table table:key-value">
              <tbody>
                <tr>
                  <th scope="row">메뉴명(한글)</th>
                  <td>{menu.korName}</td>
                  <th scope="row">메뉴명(영문)</th>
                  <td>{menu.engName}</td>
                </tr>
                <tr>
                  <th scope="row">카테고리</th>
                  <td>{menu.categoryName}</td>
                  <th scope="row">가격</th>
                  <td className="font-weight:bold">{won(menu.price)}원</td>
                </tr>
                <tr>
                  <th scope="row">slug</th>
                  <td colSpan={3}>
                    <code>{menu.slug}</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">설명</th>
                  <td colSpan={3}>{menu.description}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="m3-card card:outlined card-padding:self" aria-labelledby="sale-title">
            <h2 id="sale-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              판매 설정
            </h2>
            <table className="m3-table table:key-value">
              <tbody>
                <tr>
                  <th scope="row">판매 상태</th>
                  <td>
                    <span className={`m3-badge badge:inline badge-color:${status.color}`}>{status.label}</span>
                  </td>
                  <th scope="row">신메뉴 표시</th>
                  <td>{menu.isNew ? "예" : "아니오"}</td>
                </tr>
                <tr>
                  <th scope="row">제공 옵션</th>
                  <td>
                    {options.length ? (
                      <span className="display:flex flex-wrap:wrap gap:1">
                        {options.map((o) => (
                          <span key={o} className="m3-chip">
                            {o}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="color:text-muted">없음</span>
                    )}
                  </td>
                  <th scope="row">사용자 페이지</th>
                  <td>
                    {menu.status === "hidden" ? (
                      <span className="color:text-muted">비공개</span>
                    ) : (
                      <Link href={`/menus/${menu.slug}`} className="color:link">
                        /menus/{menu.slug} ↗
                      </Link>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="m3-card card:outlined card-padding:self" aria-labelledby="stat-title">
            <h2 id="stat-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              판매 통계
            </h2>
            <ul className="m3-grid grid-cols:4 grid-gap:3">
              {cards.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </ul>
          </section>
        </div>

        <div className="display:flex flex-direction:column gap:5">
          <section className="m3-card card:outlined card-padding:self" aria-labelledby="image-title">
            <h2 id="image-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              대표 이미지
            </h2>
            <figure className="margin:0">
              <div className="border-radius:3 overflow:hidden background-color:surface-2">
                <img
                  src={image(menu.imgSrc, menu.slug)}
                  alt={menu.korName}
                  className="width:full aspect-ratio:video object-fit:cover"
                />
              </div>
              <figcaption className="margin-top:2 font-size:caption color:text-muted">
                {image(menu.imgSrc, menu.slug)}
              </figcaption>
            </figure>
          </section>

          <section className="m3-card card:outlined card-padding:self" aria-labelledby="history-title">
            <h2 id="history-title" className="margin-bottom:4 font-size:body-lg font-weight:semibold">
              변경 이력
            </h2>
            <ol className="m3-list list-size:compact">
              {history.map((h, i) => (
                <li key={i} className="list-item">
                  <div className="list-content">
                    <span className="list-supporting">{dateTime(h.createdAt)}</span>
                    <span className="list-headline">{h.content}</span>
                  </div>
                  <span className="list-trailing">{h.actor ?? "-"}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
