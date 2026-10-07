import Link from "next/link";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { MenuTable } from "./_components/MenuTable";
import styles from "./menus.module.css";

type MenuSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  status?: string | string[];
  sort?: string | string[];
  created?: string | string[];
  deleted?: string | string[];
  missing?: string | string[];
}>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminMenusPage({ searchParams }: { searchParams: MenuSearchParams }) {
  await requireRole("admin", "/admin/menus");
  const { q, category, status, sort, created, deleted, missing } = await searchParams;
  const query = single(q).trim().slice(0, 100);
  const allMenus = await mockMenuRepository.list();
  const categories = [...new Set(allMenus.map((menu) => menu.category))].sort((a, b) => a.localeCompare(b, "ko"));
  const selectedCategory = categories.includes(single(category)) ? single(category) : "";
  const selectedStatus = ["available", "unavailable"].includes(single(status)) ? single(status) : "";
  const selectedSort = ["newest", "oldest", "name", "price-low", "price-high"].includes(single(sort)) ? single(sort) : "newest";
  const needle = query.toLocaleLowerCase("ko");
  const visibleMenus = allMenus
    .filter((menu) => {
      const matchesQuery = !query || menu.name.toLocaleLowerCase("ko").includes(needle) || menu.nameEn.toLocaleLowerCase("en").includes(needle);
      const matchesStatus = !selectedStatus || menu.available === (selectedStatus === "available");
      return matchesQuery && (!selectedCategory || menu.category === selectedCategory) && matchesStatus;
    })
    .sort((a, b) => {
      if (selectedSort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (selectedSort === "name") return a.name.localeCompare(b.name, "ko");
      if (selectedSort === "price-low") return a.price - b.price;
      if (selectedSort === "price-high") return b.price - a.price;
      return b.createdAt.localeCompare(a.createdAt);
    });
  const createdId = single(created);

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

      {createdId && allMenus.some((menu) => menu.id === createdId) && (
        <p className={styles.notice} role="status">메뉴가 등록되었습니다. <Link href={`/admin/menus/${createdId}`}>상세 보기</Link></p>
      )}
      {single(deleted) === "1" && <p className={styles.notice} role="status">메뉴를 삭제했습니다.</p>}
      {single(missing) === "1" && <p className={styles.notice} role="status">이미 삭제되었거나 존재하지 않는 메뉴입니다.</p>}

      <form className={styles.filters} method="get" role="search">
        <div className={styles.searchField}>
          <label htmlFor="menu-query">메뉴명</label>
          <input id="menu-query" name="q" type="search" defaultValue={query} placeholder="한글 또는 영어 메뉴명" />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="menu-category">카테고리</label>
          <select id="menu-category" name="category" defaultValue={selectedCategory}>
            <option value="">전체</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className={styles.filterField}>
          <label htmlFor="menu-status">상태</label>
          <select id="menu-status" name="status" defaultValue={selectedStatus}>
            <option value="">전체</option>
            <option value="available">판매 중</option>
            <option value="unavailable">판매 중지</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label htmlFor="menu-sort">정렬</label>
          <select id="menu-sort" name="sort" defaultValue={selectedSort}>
            <option value="newest">등록일 최신순</option>
            <option value="oldest">등록일 오래된순</option>
            <option value="name">메뉴명순</option>
            <option value="price-low">가격 낮은순</option>
            <option value="price-high">가격 높은순</option>
          </select>
        </div>
        <button className="button" type="submit">검색</button>
      </form>

      <section className={styles.results} aria-label="메뉴 조회 결과">
        <div className={styles.resultsHeader}>
          <h2>조회 결과</h2>
          <span>총 {visibleMenus.length}개</span>
        </div>
        <MenuTable menus={visibleMenus} createdId={createdId} />
        {visibleMenus.length === 0 && (
          <EmptyState
            title={allMenus.length === 0 ? "등록된 메뉴가 없습니다" : "조건에 맞는 메뉴가 없습니다"}
            description={allMenus.length === 0 ? "메뉴 등록 버튼에서 새 메뉴를 추가해 주세요." : "검색어와 필터 조건을 바꿔 다시 검색해 주세요."}
            action={allMenus.length > 0 ? <Link className="button" href="/admin/menus">전체 메뉴 보기</Link> : <Link className="button" href="/admin/menus/new">메뉴 등록</Link>}
          />
        )}
      </section>
    </div>
  );
}
