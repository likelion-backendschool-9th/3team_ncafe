import Link from "next/link";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { mockCategoryRepository } from "@/app/_lib/mock/categories";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { CategoryList } from "./_components/CategoryList";
import { CreateCategoryForm } from "./_components/CreateCategoryForm";
import styles from "./categories.module.css";

export default async function AdminCategoriesPage() {
  await requireRole("admin", "/admin/categories");
  const [categories, menus] = await Promise.all([mockCategoryRepository.list(), mockMenuRepository.list()]);
  const menuCountByCategory = new Map<string, number>();
  for (const menu of menus) {
    for (const category of menu.categories) {
      menuCountByCategory.set(category, (menuCountByCategory.get(category) ?? 0) + 1);
    }
  }
  const menuCounts = Object.fromEntries(menuCountByCategory);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><span>카테고리 관리</span>
      </nav>

      <div className={styles.heading}>
        <div>
          <p className="eyebrow">카테고리 관리</p>
          <h1>카테고리</h1>
          <p>메뉴 등록 폼에서 선택할 수 있는 카테고리를 추가·수정·삭제합니다.</p>
        </div>
      </div>

      <CreateCategoryForm />

      {categories.length > 0 ? (
        <CategoryList categories={categories} menuCounts={menuCounts} />
      ) : (
        <EmptyState title="등록된 카테고리가 없습니다" description="위 입력란에서 첫 카테고리를 추가해 주세요." />
      )}
    </div>
  );
}
