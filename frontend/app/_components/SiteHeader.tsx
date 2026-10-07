import Link from 'next/link';
import { getCurrentUser } from '@/app/_lib/session/session';
import { logout } from '@/app/_lib/session/logout';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/" aria-label="nCafe 시작 화면">
          <span className="brand__mark">
            <span>Since</span>
            <strong>1987</strong>
          </span>
          <span>삼다방</span>
        </Link>
        <nav className="site-header__nav" aria-label="주 메뉴">
          <Link href="/menus">메뉴</Link>
          <Link href="/cart">장바구니</Link>
          <Link href="/deliveries">배달현황</Link>
          <Link href="/orders">주문목록</Link>
        </nav>
        <div className="site-header__auth">
          {user ? (
            <form action={logout}>
              <button className="text-button" type="submit">
                로그아웃
              </button>
            </form>
          ) : (
            <>
              <Link href="/login">로그인</Link>
              <Link className="button button--small" href="/signup">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
