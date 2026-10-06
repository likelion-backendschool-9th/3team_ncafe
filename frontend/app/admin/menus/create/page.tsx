// 메뉴 등록 — 방(m3-layout)은 app/admin/layout.tsx 가 그린다. 여기는 layout-content 안: 브레드크럼 · 머리 · MenuForm.
import Link from "next/link";
import MenuForm from "../_components/MenuForm";

export default function AdminMenuCreatePage() {
  return (
    <>
      <nav className="m3-breadcrumb breadcrumb-size:sm" aria-label="현재 위치">
        <span>메뉴 관리</span>
        <Link href="/admin/menus/list">메뉴 목록</Link>
        <span aria-current="page">메뉴 등록</span>
      </nav>

      <div className="display:flex align-items:flex-end justify-content:space-between flex-wrap:wrap gap:4 margin-bottom:7">
        <div>
          <h1 className="font-size:heading-md font-weight:bold letter-spacing:tight">메뉴 등록</h1>
          <p className="margin-top:2 font-size:body-sm color:text-muted">새로운 메뉴 정보를 입력하고 등록합니다.</p>
        </div>
        <Link href="/admin/menus/list" className="m3-btn btn:outlined">
          목록으로
        </Link>
      </div>

      <MenuForm mode="create" cancelHref="/admin/menus/list" />
    </>
  );
}
