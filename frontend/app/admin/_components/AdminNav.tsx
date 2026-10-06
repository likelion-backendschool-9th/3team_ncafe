"use client";
// 관리자 내비 드로어 — 앱 셸(m3-layout)의 layout-drawer 슬롯. 현재 경로에 drawer-item-active.
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; name: string; icon: string; exact?: boolean };
const SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "대시보드", items: [{ href: "/admin", name: "홈", icon: "home", exact: true }] },
  {
    title: "메뉴 관리",
    items: [
      { href: "/admin/menus/list", name: "메뉴 목록", icon: "menu" },
      { href: "/admin/menus/create", name: "메뉴 등록", icon: "add" },
    ],
  },
  { title: "주문 관리", items: [{ href: "/admin/menus/list", name: "주문 목록", icon: "description" }] },
  { title: "회원 관리", items: [{ href: "/admin/menus/list", name: "회원 목록", icon: "people" }] },
];

export default function AdminNav() {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <nav className="m3-nav-drawer layout-drawer" aria-label="관리자 메뉴">
      <div className="drawer-header">
        <Link href="/admin" className="drawer-headline">
          NCafe <span className="color:primary">Admin</span>
        </Link>
      </div>
      <div className="drawer-content">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className="drawer-section-header">{s.title}</p>
            {s.items.map((it) => (
              <Link
                key={it.href + it.name}
                href={it.href}
                className={`drawer-item${active(it.href, it.exact) ? " drawer-item-active" : ""}`}
                aria-current={active(it.href, it.exact) ? "page" : undefined}
              >
                <i className={`m3-icon icon:${it.icon}`} aria-hidden="true"></i>
                <span className="drawer-label">{it.name}</span>
              </Link>
            ))}
          </div>
        ))}
        <p className="drawer-section-header">바로 가기</p>
        <Link href="/" className="drawer-item">
          <i className="m3-icon icon:arrow_back" aria-hidden="true"></i>
          <span className="drawer-label">사용자 사이트로</span>
        </Link>
      </div>
    </nav>
  );
}
