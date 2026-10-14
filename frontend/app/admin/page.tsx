import Link from "next/link";
import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { mockOrderRepository } from "@/app/_lib/mock/orders";
import { requireRole } from "@/app/_lib/session/session";
import styles from "./admin.module.css";

const todayFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" });

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [menus, musicRequests, orders] = await Promise.all([mockMenuRepository.list(), mockMusicBoxRepository.list(), mockOrderRepository.listAll()]);
  const availableCount = menus.filter((menu) => menu.available).length;
  const pendingMusicCount = musicRequests.filter((request) => request.status === "pending").length;
  const activeOrderCount = orders.filter((order) => order.status === "received" || order.status === "preparing").length;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>관리자 인덱스</p>
        <h1>삼다방 관리</h1>
        <span className={styles.divider} aria-hidden="true" />
        <p>메뉴부터 관리해 보세요. 현재 등록된 메뉴와 판매 상태를 확인할 수 있습니다.</p>
        <p className={styles.today}><span className={styles.todayDot} aria-hidden="true" />{todayFormat.format(new Date())} 영업 장부</p>
      </header>

      <section className={styles.summary} aria-label="메뉴 현황">
        <div className={styles.metric}><span>전체 메뉴</span><strong>{menus.length}<small>개</small></strong></div>
        <div className={styles.metric}><span>판매 중</span><strong>{availableCount}<small>개</small></strong></div>
        <div className={styles.metric}><span>판매 중지</span><strong>{menus.length - availableCount}<small>개</small></strong></div>
      </section>

      <div className={styles.cards}>
        <section className={`${styles.card} ${styles.cardRed}`} aria-labelledby="menu-management-title">
          <p className={styles.cardLabel}>메뉴 관리</p>
          <h2 id="menu-management-title">메뉴 목록</h2>
          <p>메뉴 목록에서 상세 확인, 등록, 수정, 삭제로 이동합니다.</p>
          <Link className={styles.cardLink} href="/admin/menus">메뉴 목록 보기</Link>
        </section>

        <section className={`${styles.card} ${styles.cardTeal}`} aria-labelledby="category-management-title">
          <p className={styles.cardLabel}>카테고리 관리</p>
          <h2 id="category-management-title">카테고리</h2>
          <p>메뉴 등록 폼에서 선택할 카테고리를 추가·수정·삭제합니다.</p>
          <Link className={styles.cardLink} href="/admin/categories">카테고리 관리</Link>
        </section>

        <section className={`${styles.card} ${styles.cardRed}`} aria-labelledby="order-management-title">
          <p className={styles.cardLabel}>주문 관리</p>
          <h2 id="order-management-title">처리할 주문 <strong className={styles.count}>{activeOrderCount}</strong>건</h2>
          <p>리스트에서 상태를 처리하거나 명세표 보기로 주문 품목을 확인합니다.</p>
          <Link className={styles.cardLink} href="/admin/orders">주문 목록 보기</Link>
        </section>

        <section className={`${styles.card} ${styles.cardTeal}`} aria-labelledby="music-management-title">
          <p className={styles.cardLabel}>뮤직박스</p>
          <h2 id="music-management-title">신청곡 <strong className={styles.count}>{pendingMusicCount}</strong>곡 대기 중</h2>
          <p>손님의 사연을 읽고 음원을 연결해 선곡합니다.</p>
          <Link className={styles.cardLink} href="/admin/music-box">뮤직박스 운영</Link>
        </section>
      </div>
    </div>
  );
}
