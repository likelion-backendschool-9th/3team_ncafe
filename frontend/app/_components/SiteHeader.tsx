import Link from 'next/link';
import { getCurrentUser } from '@/app/_lib/session/session';
import { BrandLogo } from './BrandLogo';
import { SiteNav } from './SiteNav';
import { UserMenu } from './UserMenu';

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
            <UserMenu
              name={user.name}
              email={user.email}
              isAdmin={user.role === 'admin'}
            />
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
