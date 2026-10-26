import { EmptyState } from "@/app/_components/ui/EmptyState";
import type { CategoryResponse } from "@/app/admin/_lib/categories/category";
import { CategoryList } from "./CategoryList";
import styles from "../categories.module.css";

type Props = { categories: CategoryResponse[] };

export function CategoryListSection({ categories }: Props) {
  return (
    <section className={styles.section} aria-labelledby="category-list-title">
      <div className={styles.sectionHeading}>
        <h2 id="category-list-title">카테고리 목록</h2>
        <span className={styles.count}>{categories.length}개</span>
        <span className={styles.sectionHint}>⠿를 끌거나 ▲▼를 눌러 순서를 바꿀 수 있어요.</span>
      </div>
      {categories.length > 0 ? (
        <CategoryList categories={categories} />
      ) : (
        <EmptyState title="등록된 카테고리가 없습니다" description="위 입력란에서 첫 카테고리를 추가해 주세요." />
      )}
    </section>
  );
}
