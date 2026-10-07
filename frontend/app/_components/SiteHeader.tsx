import Link from "next/link";
import { getCurrentUser } from "@/app/_lib/session/session";
import { logout } from "@/app/_lib/session/logout";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const roleHome = user?.role === "admin" ? "/admin" : user?.role === "driver" ? "/driver" : "/";

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href={roleHome} aria-label="nCafe 시작 화면">
          <span className="brand__mark">n</span>
          <span>nCafe</span>
        </Link>
        <nav className="site-header__nav" aria-label="주 메뉴">
          {user ? (
            <>
              <span className="user-badge">{user.name} · {user.role === "admin" ? "관리자" : user.role === "driver" ? "배달기사" : "고객"}</span>
              <form action={logout}>
                <button className="text-button" type="submit">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">로그인</Link>
              <Link className="button button--small" href="/signup">회원가입</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
