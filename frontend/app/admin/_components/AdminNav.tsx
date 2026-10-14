"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "관리자 홈" },
  { href: "/admin/menus", label: "메뉴 목록" },
  { href: "/admin/orders", label: "주문 관리" },
  { href: "/admin/categories", label: "카테고리 관리" },
  { href: "/admin/music-box", label: "뮤직박스 운영" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-labelledby="admin-nav-title">
      <ul className="workspace__nav">
        {links.map(({ href, label }) => {
          // 관리자 홈은 모든 관리 경로의 앞부분이라 정확히 같을 때만 현재 페이지로 본다.
          const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}>{label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
