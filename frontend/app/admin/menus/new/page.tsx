import Link from "next/link";
import { requireRole } from "@/app/_lib/session/session";
import { createMenu, type MenuFormState } from "../_actions";
import { MenuForm } from "../_components/MenuForm";
import styles from "../menus.module.css";

const initialState: MenuFormState = {
  values: { name: "", nameEn: "", imageUrl: "", description: "", category: "", price: "", available: "true", isNew: "false", recommended: "false" },
  errors: {},
};

export default async function NewMenuPage() {
  await requireRole("admin", "/admin/menus/new");
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span>
        <Link href="/admin/menus">메뉴 목록</Link><span aria-hidden="true">/</span><span>메뉴 등록</span>
      </nav>
      <div className={styles.heading}>
        <div><p className="eyebrow">메뉴 관리</p><h1>메뉴 등록</h1><p>메뉴명, 카테고리, 가격과 판매 정보를 입력합니다.</p></div>
      </div>
      <MenuForm action={createMenu} initialState={initialState} cancelHref="/admin/menus" submitLabel="메뉴 등록" />
    </div>
  );
}
