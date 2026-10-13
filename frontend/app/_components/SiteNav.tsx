'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/menus', label: '메뉴' },
  { href: '/cart', label: '장바구니' },
  { href: '/music-box', label: '뮤직박스' },
  { href: '/orders', label: '주문목록' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-header__nav" aria-label="주 메뉴">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
