import type { Metadata } from "next";
import Link from "next/link";
import { MenuCard } from "../_components/MenuCard";
import { getMenuCategories, getMenus } from "../_lib/menus/api";
import { menuListHref, parseMenuSearchParams } from "./_lib/searchParams";
import styles from "./menus.module.css";

export const metadata: Metadata = {
  title: "메뉴 | 삼다방",
  description: "삼다방의 커피와 차, 다과 메뉴를 한눈에 둘러보세요.",
};

type MenuSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MenusPage({ searchParams }: { searchParams: MenuSearchParams }) {
  const query = parseMenuSearchParams(await searchParams);
  const [menus, categories] = await Promise.all([getMenus(query), getMenuCategories()]);
  const filtered = query.q !== "" || query.categoryId !== null;

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <p className={styles.eyebrow}>삼다방 메뉴판</p>
          <h1 className={styles.title}>전체 메뉴</h1>
          <p className={styles.subtitle}>정성껏 준비한 메뉴를 한눈에 둘러보세요.</p>
        </div>

        <nav className={styles.filterRow} aria-label="카테고리 필터">
          <Link
            href={menuListHref({ ...query, categoryId: null })}
            className={`${styles.filterChip} ${query.categoryId === null ? styles.filterChipActive : ""}`}
            aria-current={query.categoryId === null ? "page" : undefined}
          >
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={menuListHref({ ...query, categoryId: c.id })}
              className={`${styles.filterChip} ${query.categoryId === c.id ? styles.filterChipActive : ""}`}
              aria-current={query.categoryId === c.id ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <form className={styles.searchForm} method="get" role="search">
          {query.categoryId !== null && <input type="hidden" name="categoryId" value={query.categoryId} />}
          <label className={styles.searchField} htmlFor="customer-menu-query">
            메뉴 검색
            <input id="customer-menu-query" name="q" type="search" maxLength={100} defaultValue={query.q} placeholder="메뉴 이름" />
          </label>
          <label className={styles.sortField} htmlFor="customer-menu-sort">
            정렬
            <select id="customer-menu-sort" name="sort" defaultValue={query.sort}>
              <option value="newest">최근 등록순</option>
              <option value="name">메뉴명순</option>
              <option value="price-low">가격 낮은순</option>
              <option value="price-high">가격 높은순</option>
            </select>
          </label>
          <button className="button" type="submit">검색</button>
        </form>

        <div className={styles.resultRow}>
          <p>메뉴 <strong>{menus.totalElements}</strong>개</p>
          {(filtered || query.sort !== "newest") && <Link href="/menus">전체 메뉴 보기</Link>}
        </div>

        {menus.items.length === 0 ? (
          <div className={styles.empty} role="status">
            <p>{filtered ? "조건에 맞는 메뉴가 없어요." : "등록된 메뉴가 아직 없어요."}</p>
            {filtered && <Link href="/menus">검색 조건 초기화</Link>}
          </div>
        ) : (
          <div className={styles.grid}>
            {menus.items.map((menu) => (
              <MenuCard key={menu.id} menu={menu} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
