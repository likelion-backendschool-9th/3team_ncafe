import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/app/_lib/session/session";
import { UserProfilePanel } from "../_components/UserProfilePanel";
import { UserStatusPanel } from "../_components/UserStatusPanel";
import { getUser } from "../_lib/api";
import { parseUserId, parseUserSearchParams, userListQuery, type UserSearchParams } from "../_lib/searchParams";
import styles from "../users.module.css";

export const metadata: Metadata = { title: "회원 상세 | 삼다방" };

export default async function AdminUserDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<UserSearchParams>;
}) {
  const { id: rawId } = await params;
  await requireRole("admin", `/admin/users/${encodeURIComponent(rawId)}`);
  const id = parseUserId(rawId);
  if (id === null) notFound();
  const user = await getUser(id);
  if (!user) notFound();
  const listHref = `/admin/users${userListQuery(parseUserSearchParams(await searchParams))}`;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><Link href={listHref}>회원 관리</Link><span aria-hidden="true">/</span><span aria-current="page">회원 상세</span></nav>
      <header className={styles.heading}><div><p className="eyebrow">삼다방 회원 장부</p><h1>회원 상세</h1><p>회원의 기본 정보와 현재 이용 상태를 확인합니다.</p></div><Link className={styles.outlineButton} href={listHref}>← 목록으로</Link></header>
      <div className={styles.detailGrid}>
        <UserProfilePanel user={user} />
        <UserStatusPanel user={user} />
      </div>
    </div>
  );
}
