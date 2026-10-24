import Link from "next/link";
import { userListQuery } from "../_lib/searchParams";
import type { UserPageResponse } from "../_lib/user";
import { UserPagination } from "./UserPagination";
import { UserRow } from "./UserRow";
import styles from "../users.module.css";

type Props = { users: UserPageResponse };

export function UserList({ users }: Props) {
  const totalPages = Math.max(1, users.totalPages);
  const query = userListQuery(users.page);

  return (
    <section className={styles.section} aria-labelledby="user-list-title">
      <div className={styles.sectionHeading}>
        <h2 id="user-list-title">회원 목록 <span className={styles.count}>{users.totalElements}명</span></h2>
        <p className={styles.hint}>닉네임을 누르면 상세 정보를 확인할 수 있습니다.</p>
      </div>
      {users.items.length > 0 ? <>
        <div className={styles.tableWrap} role="region" aria-label="회원 목록 표 · 좌우 스크롤 가능" tabIndex={0}>
          <table className={styles.table}>
            <caption className={styles.hint}>전체 {users.totalElements}명 · {users.page} / {totalPages} 페이지</caption>
            <thead><tr><th scope="col">닉네임</th><th scope="col">이메일</th><th scope="col">권한</th><th scope="col">이용 상태</th><th scope="col">관리</th></tr></thead>
            <tbody>{users.items.map((user) => <UserRow key={user.id} user={user} query={query} />)}</tbody>
          </table>
        </div>
        <UserPagination page={users.page} totalPages={totalPages} />
      </> : users.totalElements > 0 ? (
        <div className={styles.empty}><h3>이 페이지에는 회원이 없습니다</h3><p>마지막 페이지는 {totalPages}페이지입니다.</p><Link className={styles.outlineButton} href="/admin/users">첫 페이지로</Link></div>
      ) : (
        <div className={styles.empty}><h3>가입한 회원이 없습니다</h3><p>회원이 가입하면 이 목록에 표시됩니다.</p></div>
      )}
    </section>
  );
}
