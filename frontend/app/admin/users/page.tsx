import type { Metadata } from "next";
import Link from "next/link";
import { listMockUsers } from "@/app/_lib/mock/users";
import { requireRole } from "@/app/_lib/session/session";
import { UserStatusForm } from "./_components/UserStatusForm";
import { UserFilters } from "./_components/UserFilters";
import { UserStatusFeedback } from "./_components/UserStatusFeedback";
import { PAGE_SIZE, roleLabels, statusLabels, userFilters, usersQuery, visibleUsers, type UserSearchParams } from "./_lib/queries";
import styles from "./users.module.css";

export const metadata: Metadata = { title: "회원 관리 | 삼다방" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UserSearchParams> }) {
  await requireRole("admin", "/admin/users");
  const filters = userFilters(await searchParams);
  const users = listMockUsers();
  const filtered = visibleUsers(users, filters);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const members = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = users.filter((user) => user.status === "active").length;
  const query = usersQuery(filters, page);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><span aria-current="page">회원 관리</span></nav>
      <header className={styles.heading}>
        <div><p className="eyebrow">삼다방 회원 장부</p><h1>회원 관리</h1><p>회원 정보를 살펴보고 계정의 이용 상태를 관리합니다.</p></div>
        <span className={styles.hint}>전체 회원 기준 · 관리자 포함</span>
      </header>
      <section className={styles.summary} aria-label="회원 현황">
        <div className={styles.metric}><span>전체 회원</span><strong>{users.length}<small>명</small></strong></div>
        <div className={styles.metric}><span>정상 이용</span><strong>{activeCount}<small>명</small></strong></div>
        <div className={styles.metric}><span>이용 정지</span><strong>{users.length - activeCount}<small>명</small></strong></div>
      </section>
      <UserFilters key={query} filters={filters} />
      <UserStatusFeedback key={usersQuery(filters)}>
      <section className={styles.section} aria-labelledby="user-list-title">
        <div className={styles.sectionHeading}><h2 id="user-list-title">회원 목록 <span className={styles.count}>{filtered.length}명</span></h2><p className={styles.hint}>회원 이름을 누르면 상세 정보를 확인할 수 있습니다.</p></div>
        {members.length > 0 ? <>
          <div className={styles.tableWrap} role="region" aria-label="회원 목록 표 · 좌우 스크롤 가능" tabIndex={0}>
            <table className={styles.table}>
              <caption className={styles.hint}>검색 결과 {filtered.length}명 · {page} / {pageCount} 페이지</caption>
              <thead><tr><th scope="col">회원</th><th scope="col">이메일</th><th scope="col">권한</th><th scope="col">이용 상태</th><th scope="col">관리</th></tr></thead>
              <tbody>{members.map((user) => <tr key={user.id}>
                <td><div className={styles.person}><span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1)}</span><Link className={styles.memberName} href={`/admin/users/${encodeURIComponent(user.id)}${query}`}>{user.name}</Link></div></td>
                <td>{user.email}</td>
                <td><span className={user.role === "admin" ? `${styles.badge} ${styles.admin}` : styles.secondary}>{roleLabels[user.role]}</span></td>
                <td><span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></td>
                <td><div className={styles.rowActions}><Link className={styles.outlineButton} href={`/admin/users/${encodeURIComponent(user.id)}${query}`}>상세 보기</Link><UserStatusForm user={user} compact /></div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="회원 목록 페이지 이동">
            {page > 1 ? <Link className={styles.outlineButton} href={`/admin/users${usersQuery(filters, page - 1)}`}>← 이전</Link> : <span className={styles.secondary}>← 이전</span>}
            <span aria-current="page">{page} / {pageCount}</span>
            {page < pageCount ? <Link className={styles.outlineButton} href={`/admin/users${usersQuery(filters, page + 1)}`}>다음 →</Link> : <span className={styles.secondary}>다음 →</span>}
          </nav>
        </> : <div className={styles.empty}><h3>조건에 맞는 회원이 없습니다</h3><p>검색어나 필터를 변경해 다시 찾아보세요.</p><Link className={styles.outlineButton} href="/admin/users">전체 회원 보기</Link></div>}
      </section>
      </UserStatusFeedback>
    </div>
  );
}
