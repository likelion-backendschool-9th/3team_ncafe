import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/app/_lib/session/session";
import { getCategories } from "./_lib/api";
import { CategoryListSection } from "./_components/CategoryListSection";
import { CreateCategoryForm } from "./_components/CreateCategoryForm";
import styles from "./categories.module.css";

export const metadata: Metadata = { title: "카테고리 관리 | 삼다방" };

export default async function AdminCategoriesPage() {
  await requireRole("admin", "/admin/categories");
  const categories = await getCategories();

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
      <CategoryListSection categories={categories} />
    </div>
  );
}
