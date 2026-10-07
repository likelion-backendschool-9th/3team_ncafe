import Link from "next/link";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { MenuTable } from "./_components/MenuTable";
import styles from "./menus.module.css";

type MenuSearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  created?: string | string[];
  deleted?: string | string[];
  missing?: string | string[];
}>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminMenusPage({ searchParams }: { searchParams: MenuSearchParams }) {
  await requireRole("admin", "/admin/menus");
  const { q, status, created, deleted, missing } = await searchParams;
  const query = single(q).trim().slice(0, 100);
  const selectedStatus = single(status);
  const allMenus = await mockMenuRepository.list();
  const visibleMenus = allMenus
    .filter((menu) => {
      const matchesQuery = !query || menu.name.toLocaleLowerCase("ko").includes(query.toLocaleLowerCase("ko"));
      const matchesStatus = selectedStatus === "available"
        ? menu.available
        : selectedStatus === "unavailable"
          ? !menu.available
          : true;
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
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
          <p>등록된 메뉴의 가격과 판매 상태를 확인합니다.</p>
        </div>
        <Link className="button" href="/admin/menus/new">메뉴 등록</Link>
      </div>

      {createdId && allMenus.some((menu) => menu.id === createdId) && (
        <p className={styles.notice} role="status">메뉴가 등록되었습니다. <Link href={`/admin/menus/${createdId}`}>상세 보기</Link></p>
      )}
      {single(deleted) === "1" && <p className={styles.notice} role="status">메뉴를 삭제했습니다.</p>}
      {single(missing) === "1" && <p className={styles.notice} role="status">이미 삭제되었거나 존재하지 않는 메뉴입니다.</p>}

      <form className={styles.filters} method="get" role="search">
        <div className={styles.field}>
          <label htmlFor="menu-query">메뉴명</label>
          <input id="menu-query" name="q" type="search" defaultValue={query} placeholder="메뉴 이름 검색" />
        </div>
        <div className={styles.field}>
          <label htmlFor="menu-status">판매 상태</label>
          <select id="menu-status" name="status" defaultValue={selectedStatus}>
            <option value="">전체</option>
            <option value="available">판매 중</option>
            <option value="unavailable">판매 중지</option>
          </select>
        </div>
        <button className="button" type="submit">조회</button>
        <Link className={styles.reset} href="/admin/menus">초기화</Link>
      </form>

      <section className={styles.results} aria-label="메뉴 조회 결과">
        <div className={styles.resultsHeader}>
          <h2>조회 결과</h2>
          <span>총 {visibleMenus.length}개</span>
        </div>
        {visibleMenus.length > 0 ? (
          <MenuTable menus={visibleMenus} createdId={createdId} />
        ) : (
          <EmptyState
            title={allMenus.length === 0 ? "등록된 메뉴가 없습니다" : "조건에 맞는 메뉴가 없습니다"}
            description={allMenus.length === 0 ? "메뉴 등록 버튼에서 새 메뉴를 추가해 주세요." : "검색어나 판매 상태를 바꿔 다시 조회해 주세요."}
            action={allMenus.length > 0 ? <Link className="button" href="/admin/menus">전체 메뉴 보기</Link> : <Link className="button" href="/admin/menus/new">메뉴 등록</Link>}
          />
        )}
      </section>
    </div>
  );
}
