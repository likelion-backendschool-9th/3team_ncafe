"use client";

import Link from "next/link";
import { useState } from "react";
import type { userFilters } from "../_lib/queries";
import styles from "../users.module.css";

export function UserFilters({ filters }: { filters: ReturnType<typeof userFilters> }) {
  const [values, setValues] = useState(filters);
  const change = (field: "q" | "status" | "role" | "sort", value: string) => setValues((previous) => ({ ...previous, [field]: value }));
  return (
    <form className={styles.filters} method="get" role="search" aria-label="회원 검색">
      <div className={styles.searchField}><label htmlFor="user-query">회원 검색</label><input id="user-query" name="q" type="search" placeholder="이름 또는 이메일을 입력하세요" maxLength={100} value={values.q} onChange={(event) => change("q", event.target.value)} /></div>
      <div className={styles.filterField}><label htmlFor="user-status">이용 상태</label><select id="user-status" name="status" value={values.status} onChange={(event) => change("status", event.target.value)}><option value="">전체 상태</option><option value="active">정상</option><option value="suspended">이용 정지</option></select></div>
      <div className={styles.filterField}><label htmlFor="user-role">권한</label><select id="user-role" name="role" value={values.role} onChange={(event) => change("role", event.target.value)}><option value="">전체 권한</option><option value="customer">회원</option><option value="admin">관리자</option></select></div>
      <div className={styles.filterField}><label htmlFor="user-sort">정렬</label><select id="user-sort" name="sort" value={values.sort} onChange={(event) => change("sort", event.target.value)}><option value="name">이름순</option><option value="email">이메일순</option></select></div>
      <button className="button" type="submit">검색</button>
      <Link className={styles.outlineButton} href="/admin/users" onClick={() => setValues({ q: "", status: "", role: "", sort: "name", page: 1 })}>초기화</Link>
    </form>
  );
}
