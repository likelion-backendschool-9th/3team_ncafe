import Link from "next/link";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import styles from "./admin.module.css";

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const menus = await mockMenuRepository.list();
  const availableCount = menus.filter((menu) => menu.available).length;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className="eyebrow">관리자 인덱스</p>
        <h1>nCafe 관리</h1>
        <p>메뉴부터 관리해 보세요. 현재 등록된 메뉴와 판매 상태를 확인할 수 있습니다.</p>
      </header>

      <section className={styles.summary} aria-label="메뉴 현황">
        <div className={styles.metric}><span>전체 메뉴</span><strong>{menus.length}</strong></div>
        <div className={styles.metric}><span>판매 중</span><strong>{availableCount}</strong></div>
        <div className={styles.metric}><span>판매 중지</span><strong>{menus.length - availableCount}</strong></div>
      </section>

      <section className={styles.card} aria-labelledby="menu-management-title">
        <div>
          <p className="eyebrow">메뉴 관리</p>
          <h2 id="menu-management-title">메뉴 목록</h2>
          <p>메뉴 목록에서 상세 확인, 등록, 수정, 삭제로 이동합니다.</p>
        </div>
        <Link className="button" href="/admin/menus">메뉴 목록 보기</Link>
      </section>

      <section className={styles.card} aria-labelledby="category-management-title">
        <div>
          <p className="eyebrow">카테고리 관리</p>
          <h2 id="category-management-title">카테고리</h2>
          <p>메뉴 등록 폼에서 선택할 카테고리를 추가·수정·삭제합니다.</p>
        </div>
        <Link className="button" href="/admin/categories">카테고리 관리</Link>
      </section>
    </div>
  );
}
