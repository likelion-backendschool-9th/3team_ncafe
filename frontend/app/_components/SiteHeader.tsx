import Link from 'next/link';
import { getCurrentUser } from '@/app/_lib/session/session';
import { logout } from '@/app/_lib/session/logout';
import { BrandLogo } from './BrandLogo';
import { SiteNav } from './SiteNav';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/" aria-label="삼다방 시작 화면">
          <BrandLogo />
        </Link>
        <SiteNav />
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
