import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findMockUserById } from "@/app/_lib/mock/users";
import { requireRole } from "@/app/_lib/session/session";
import { UserStatusForm } from "../_components/UserStatusForm";
import { roleLabels, statusLabels, userFilters, usersQuery, type UserSearchParams } from "../_lib/queries";
import styles from "../users.module.css";

export const metadata: Metadata = { title: "회원 상세 | 삼다방" };

export default async function AdminUserDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<UserSearchParams>;
}) {
  const { id } = await params;
  await requireRole("admin", `/admin/users/${encodeURIComponent(id)}`);
  const user = findMockUserById(id);
  if (!user) notFound();
  const listHref = `/admin/users${usersQuery(userFilters(await searchParams))}`;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><Link href={listHref}>회원 관리</Link><span aria-hidden="true">/</span><span aria-current="page">회원 상세</span></nav>
      <header className={styles.heading}><div><p className="eyebrow">삼다방 회원 장부</p><h1>회원 상세</h1><p>회원의 기본 정보와 현재 이용 상태를 확인합니다.</p></div><Link className={styles.outlineButton} href={listHref}>← 목록으로</Link></header>
      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="user-info-title">
          <h2 id="user-info-title" className={styles.panelHeading}>기본 정보</h2>
          <div className={styles.profile}><span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1)}</span><div><h2>{user.name}</h2><span className={styles.secondary}>{roleLabels[user.role]}</span></div></div>
          <dl className={styles.details}>
            <div><dt>회원 ID</dt><dd>{user.id}</dd></div>
            <div><dt>이름</dt><dd>{user.name}</dd></div>
            <div><dt>이메일</dt><dd>{user.email}</dd></div>
            <div><dt>권한</dt><dd>{roleLabels[user.role]}</dd></div>
            <div><dt>이용 상태</dt><dd><span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></dd></div>
          </dl>
        </section>
        <section className={`${styles.panel} ${styles.statusPanel}`} aria-labelledby="user-state-title">
          <h2 id="user-state-title" className={styles.panelHeading}>이용 상태 관리</h2>
          <p>현재 상태 <span className={`${styles.badge} ${styles[user.status]}`}>{statusLabels[user.status]}</span></p>
          <p className={styles.hint}>이용 정지된 회원은 로그인과 회원 서비스를 이용할 수 없습니다. 정지를 해제하면 다시 이용할 수 있습니다.</p>
          <UserStatusForm user={user} />
        </section>
      </div>
    </div>
  );
}
