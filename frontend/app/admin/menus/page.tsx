import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { requireRole } from "@/app/_lib/session/session";
import { getCategories } from "@/app/admin/_lib/categories/api";
import { MenuFilterSelect } from "./_components/MenuFilterSelect";
import { MenuPagination } from "./_components/MenuPagination";
import { MenuTable } from "./_components/MenuTable";
import { getMenus } from "./_lib/api";
import { MENU_SORTS, sortLabels, statusLabels } from "./_lib/menu";
import { parseMenuId, parseMenuSearchParams, type MenuSearchParams } from "./_lib/searchParams";
import styles from "./menus.module.css";

export const metadata: Metadata = { title: "메뉴 관리 | 삼다방" };

const single = (value: MenuSearchParams[string]) => (typeof value === "string" ? value : "");

export default async function AdminMenusPage({ searchParams }: { searchParams: Promise<MenuSearchParams> }) {
  await requireRole("admin", "/admin/menus");
  const raw = await searchParams;
  const query = parseMenuSearchParams(raw);
  const [result, categories] = await Promise.all([getMenus(query), getCategories()]);
  const filtered = query.q !== "" || query.categoryId !== null || query.status !== "" || query.page > 1;
  const createdId = parseMenuId(single(raw.created));

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><span>메뉴 목록</span>
      </nav>

      <div className={styles.heading}>
        <div>
          <p className="eyebrow">메뉴 관리</p>
          <h1>메뉴 목록</h1>
          <p>등록된 메뉴의 이름, 카테고리, 가격과 상태를 확인합니다.</p>
        </div>
        <Link className="button" href="/admin/menus/new">메뉴 등록</Link>
      </div>

      {createdId && (
        <p className={styles.notice} role="status">메뉴가 등록되었습니다. <Link href={`/admin/menus/${createdId}`}>상세 보기</Link></p>
      )}
      {single(raw.deleted) === "1" && <p className={styles.notice} role="status">메뉴를 삭제했습니다.</p>}
      {single(raw.missing) === "1" && <p className={styles.notice} role="status">이미 삭제되었거나 존재하지 않는 메뉴입니다.</p>}

      <section className={styles.section} aria-labelledby="menu-filter-title">
        <div className={styles.sectionHeading}><h2 id="menu-filter-title">메뉴 찾기</h2></div>
        <form className={styles.filters} method="get" role="search">
          <div className={styles.searchField}>
            <label htmlFor="menu-query">메뉴명</label>
            <input id="menu-query" name="q" type="search" defaultValue={query.q} placeholder="메뉴명 또는 slug" />
          </div>
          <div className={styles.filterField}>
            <label htmlFor="menu-category">카테고리</label>
            <MenuFilterSelect key={`category-${query.categoryId}`} id="menu-category" name="categoryId" defaultValue={query.categoryId === null ? "" : String(query.categoryId)} options={[{ value: "", label: "전체" }, ...categories.map((item) => ({ value: String(item.id), label: item.name }))]} />
          </div>
          <div className={styles.filterField}>
            <label htmlFor="menu-status">상태</label>
            <MenuFilterSelect key={`status-${query.status}`} id="menu-status" name="status" defaultValue={query.status} options={[{ value: "", label: "전체" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
          </div>
          <div className={styles.filterField}>
            <label htmlFor="menu-sort">정렬</label>
            <MenuFilterSelect key={`sort-${query.sort}`} id="menu-sort" name="sort" defaultValue={query.sort} options={MENU_SORTS.map((value) => ({ value, label: sortLabels[value] }))} />
          </div>
          <button className="button" type="submit">검색</button>
        </form>
      </section>

      <section className={styles.section} aria-labelledby="menu-results-title">
        <div className={styles.sectionHeading}>
          <h2 id="menu-results-title">등록된 메뉴</h2>
          <span className={styles.count}>{result.totalElements}개</span>
        </div>
        <div className={styles.results}>
          {result.items.length > 0 ? (
            <>
              <MenuTable menus={result.items} createdId={createdId ?? undefined} />
              <MenuPagination query={query} page={result.page} totalPages={result.totalPages} />
            </>
          ) : (
            <EmptyState
              title={filtered ? "조건에 맞는 메뉴가 없습니다" : "등록된 메뉴가 없습니다"}
              description={filtered ? "검색어와 필터 조건을 바꿔 다시 검색해 주세요." : "메뉴 등록 버튼에서 새 메뉴를 추가해 주세요."}
              action={filtered ? <Link className="button" href="/admin/menus">전체 메뉴 보기</Link> : <Link className="button" href="/admin/menus/new">메뉴 등록</Link>}
            />
          )}
        </div>
      </section>
    </div>
  );
}
