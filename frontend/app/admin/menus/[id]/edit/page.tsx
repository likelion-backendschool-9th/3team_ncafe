// 메뉴 수정 — layout-content 안: 브레드크럼 · 머리 · MenuForm(초기값 = lib/mock 의 ADMIN_MENU_DETAIL.menu).
import Link from "next/link";
import MenuForm, { type MenuFormValues } from "../../_components/MenuForm";
import { ADMIN_MENU_DETAIL } from "@/lib/mock";
import { dateTime, image } from "@/lib/format";
import type { MenuDetail } from "@/lib/types";

/** 백엔드 상세(MenuDetail) → 폼 값. 옵션 목록은 폼의 체크박스 3개(HOT·ICE·Large)로 접는다. */
function valuesOf(m: MenuDetail): MenuFormValues {
  const has = (kind: string, name: string) => m.options.some((o) => o.kind === kind && o.name === name);
  return {
    korName: m.korName,
    engName: m.engName,
    categoryId: String(m.categoryId),
    price: String(m.price),
    description: m.detail || m.description,
    status: m.status,
    hot: has("temperature", "HOT"),
    ice: has("temperature", "ICE"),
    large: has("size", "Large"),
    isNew: m.isNew,
    image: { src: image(m.imgSrc, m.slug), alt: m.korName, meta: image(m.imgSrc, m.slug) },
  };
}

export default function AdminMenuEditPage() {
  const { menu } = ADMIN_MENU_DETAIL;
  const detailHref = `/admin/menus/${menu.id}`;

  return (
    <>
      <nav className="m3-breadcrumb breadcrumb-size:sm" aria-label="현재 위치">
        <span>메뉴 관리</span>
        <Link href="/admin/menus/list">메뉴 목록</Link>
        <Link href={detailHref}>{menu.korName}</Link>
        <span aria-current="page">수정</span>
      </nav>

      <div className="display:flex align-items:flex-end justify-content:space-between flex-wrap:wrap gap:4 margin-bottom:7">
        <div>
          <h1 className="font-size:heading-md font-weight:bold letter-spacing:tight">메뉴 수정</h1>
          <p className="margin-top:2 font-size:body-sm color:text-muted">
            메뉴 번호 #{menu.id} · 마지막 수정 {dateTime(menu.updatedAt)}
          </p>
        </div>
        <Link href={detailHref} className="m3-btn btn:outlined">
          상세로 돌아가기
        </Link>
      </div>

      <MenuForm mode="edit" initial={valuesOf(menu)} cancelHref={detailHref} />
    </>
  );
}
