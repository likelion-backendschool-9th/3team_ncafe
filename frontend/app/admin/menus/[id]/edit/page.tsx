import Link from "next/link";
import { notFound } from "next/navigation";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { updateMenu } from "../../_actions";
import { MenuForm } from "../../_components/MenuForm";
import styles from "../../menus.module.css";

export default async function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("admin", `/admin/menus/${id}/edit`);
  const menu = await mockMenuRepository.get(id);
  if (!menu) notFound();

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span>
        <Link href="/admin/menus">메뉴 목록</Link><span aria-hidden="true">/</span>
        <Link href={`/admin/menus/${id}`}>{menu.name}</Link><span aria-hidden="true">/</span><span>수정</span>
      </nav>
      <div className={styles.heading}><div><p className="eyebrow">메뉴 관리</p><h1>메뉴 수정</h1><p>메뉴 정보를 변경합니다.</p></div></div>
      <MenuForm
        action={updateMenu.bind(null, id)}
        initialState={{ values: { name: menu.name, description: menu.description, price: String(menu.price), available: String(menu.available) }, errors: {} }}
        cancelHref={`/admin/menus/${id}`}
        submitLabel="변경 저장"
      />
    </div>
  );
}
