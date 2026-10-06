// 메뉴 목록 — 방(m3-layout)은 app/admin/layout.tsx 가 그린다. 여기는 layout-content 안:
// 브레드크럼 · 머리 · 통계(m3-grid + StatCard) · 필터(m3-toolbar toolbar:fill) · 표(m3-card + m3-toolbar toolbar:card + m3-table) · m3-pager.
// 데이터는 lib/mock 의 ADMIN_MENUS·DASHBOARD·CATEGORIES (모양 = GET /api/admin/menus 등).
import Link from "next/link";
import StatCard, { type Stat } from "../../_components/StatCard";
import Pager from "@/app/_components/Pager";
import { ADMIN_MENUS, CATEGORIES, DASHBOARD } from "@/lib/mock";
import { date, image, MENU_STATUS, won } from "@/lib/format";

const STATS: Stat[] = [
  { label: "전체 메뉴", value: String(DASHBOARD.menusOn + DASHBOARD.menusSoldout + DASHBOARD.menusHidden) },
  { label: "판매 중", value: String(DASHBOARD.menusOn) },
  { label: "품절", value: String(DASHBOARD.menusSoldout) },
  { label: "비공개", value: String(DASHBOARD.menusHidden) },
];

export default function AdminMenuListPage() {
  return (
    <>
      <nav className="m3-breadcrumb breadcrumb-size:sm" aria-label="현재 위치">
        <span>메뉴 관리</span>
        <span aria-current="page">메뉴 목록</span>
      </nav>

      <div className="display:flex align-items:flex-end justify-content:space-between flex-wrap:wrap gap:4 margin-bottom:7">
        <div>
          <h1 className="font-size:heading-md font-weight:bold letter-spacing:tight">메뉴 목록</h1>
          <p className="margin-top:2 font-size:body-sm color:text-muted">등록된 메뉴를 조회하고 관리합니다.</p>
        </div>
        <Link href="/admin/menus/create" className="m3-btn btn-icon:leading">
          <i className="m3-icon icon:add" aria-hidden="true"></i>
          메뉴 등록
        </Link>
      </div>

      <ul className="m3-grid grid-cols:4 grid-gap:3 margin-bottom:6">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </ul>

      <form className="m3-toolbar toolbar:fill" role="search" aria-label="메뉴 검색">
        <div className="m3-text-field field:outlined field-label:none width:ex" style={{ "--width-ex": "11rem" }}>
          <select name="category" defaultValue="" aria-label="카테고리">
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="m3-text-field field:outlined field-label:none width:ex" style={{ "--width-ex": "9rem" }}>
          <select name="status" defaultValue="" aria-label="상태">
            <option value="">전체 상태</option>
            <option value="on">판매 중</option>
            <option value="soldout">품절</option>
            <option value="hidden">비공개</option>
          </select>
        </div>
        <div className="m3-text-field field:outlined field-label:none toolbar-grow">
          <input type="search" name="name" placeholder="메뉴 이름 검색" aria-label="메뉴 이름" />
        </div>
        <button type="submit" className="m3-btn btn:outlined">
          검색
        </button>
      </form>

      <section className="m3-card card:outlined" aria-label="메뉴 표">
        <div className="m3-toolbar toolbar:card">
          <div className="toolbar-start">
            <label className="m3-checkbox">
              <input type="checkbox" /> 전체 선택
            </label>
          </div>
          <div className="toolbar-end">
            <button type="button" className="m3-btn btn:outlined btn-size:xs">
              선택 비공개
            </button>
            <button type="button" className="m3-btn btn:outlined btn-color:danger btn-size:xs">
              선택 삭제
            </button>
          </div>
        </div>

        <table className="m3-table">
          <thead>
            <tr>
              <th scope="col" className="width:ex" style={{ "--width-ex": "2.5rem" }}>
                <input type="checkbox" aria-label="전체 선택" />
              </th>
              <th scope="col">번호</th>
              <th scope="col">메뉴</th>
              <th scope="col">카테고리</th>
              <th scope="col" className="table-align:end">
                가격
              </th>
              <th scope="col">상태</th>
              <th scope="col">등록일</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_MENUS.items.map((m) => (
              <tr key={m.id}>
                <td>
                  <input type="checkbox" aria-label={`${m.korName} 선택`} />
                </td>
                <td className="color:text-muted">{m.id}</td>
                <td>
                  <div className="display:flex align-items:center gap:3">
                    <img
                      src={image(m.imgSrc, m.slug)}
                      alt=""
                      className="width:9 height:9 border-radius:2 object-fit:cover"
                    />
                    <div>
                      <Link href={`/admin/menus/${m.id}`} className="font-weight:semibold">
                        {m.korName}
                      </Link>
                      <p className="font-size:caption color:text-muted">{m.engName}</p>
                    </div>
                  </div>
                </td>
                <td>{m.categoryName}</td>
                <td className="table-align:end">{won(m.price)}원</td>
                <td>
                  <span className={`m3-badge badge:inline badge-color:${MENU_STATUS[m.status].color}`}>
                    {MENU_STATUS[m.status].label}
                  </span>
                </td>
                <td className="color:text-muted">{date(m.createdAt)}</td>
                <td>
                  <div className="display:flex gap:1">
                    <Link href={`/admin/menus/${m.id}/edit`} className="m3-btn btn:text btn-size:xs">
                      수정
                    </Link>
                    <button type="button" className="m3-btn btn:text btn-color:danger btn-size:xs">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pager
          page={ADMIN_MENUS.page}
          totalPages={ADMIN_MENUS.totalPages}
          href="/admin/menus/list"
          params={{}}
          className="padding-y:5"
        />
      </section>
    </>
  );
}
