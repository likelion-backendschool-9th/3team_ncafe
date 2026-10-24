import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/app/_lib/session/session";
import { UserList } from "./_components/UserList";
import { UserStatusFeedback } from "./_components/UserStatusFeedback";
import { UserSummary } from "./_components/UserSummary";
import { getUserSummary, getUsers } from "./_lib/api";
import { parseUserSearchParams, type UserSearchParams } from "./_lib/searchParams";
import styles from "./users.module.css";

export const metadata: Metadata = { title: "회원 관리 | 삼다방" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UserSearchParams> }) {
  await requireRole("admin", "/admin/users");
  const { page } = parseUserSearchParams(await searchParams);
  const [users, summary] = await Promise.all([getUsers(page), getUserSummary()]);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span><span aria-current="page">회원 관리</span></nav>
      <header className={styles.heading}>
        <div><p className="eyebrow">삼다방 회원 장부</p><h1>회원 관리</h1><p>회원 정보를 살펴보고 계정의 이용 상태를 관리합니다.</p></div>
        <span className={styles.hint}>전체 회원 기준 · 관리자 포함</span>
      </header>
      <UserSummary summary={summary} />
      <UserStatusFeedback key={page}>
        <UserList users={users} />
      </UserStatusFeedback>
    </div>
  );
}
