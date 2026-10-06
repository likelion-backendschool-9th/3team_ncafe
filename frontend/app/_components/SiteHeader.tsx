"use client";
// 공개 사이트 헤더 — 방(m3-site)의 site-header 슬롯. 로고 · 주 내비 · 계정 동작.
// 현재 경로에 aria-current 를 붙이려고 클라이언트 컴포넌트다. 사용자(Member DTO)·장바구니 수는 레이아웃이 넘긴다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Member } from "@/lib/types";

export default function SiteHeader({ user, basketCount = 0 }: { user: Member | null; basketCount?: number }) {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const NAV = [
    { href: "/menus", name: "메뉴" },
    { href: "/about", name: "소개" },
    { href: "/my/favorites", name: "좋아요" },
    { href: "/my/basket", name: "장바구니", badge: user && basketCount > 0 ? basketCount : undefined },
  ];
  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link href="/" className="site-logo">
          NCafe
        </Link>
        <nav className="site-nav" aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined}>
              {n.name}
              {n.badge !== undefined && (
                <>
                  {" "}
                  <span className="m3-badge badge:inline badge-color:primary">{n.badge}</span>
                </>
              )}
            </Link>
          ))}
        </nav>
        <div className="site-actions">
          {user ? (
            <>
              <span className="font-size:body-sm font-weight:semibold">{user.name} 님</span>
              <button type="button" className="m3-btn btn:outlined btn-size:xs">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="m3-btn btn:outlined">
                로그인
              </Link>
              <Link href="/signup" className="m3-btn">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
