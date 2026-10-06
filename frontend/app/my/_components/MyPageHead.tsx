"use client";
// 마이 페이지 머리 — 제목 + 탭(주문 내역 · 좋아요 · 장바구니). my/* 모든 페이지 위에 같은 것이 놓인다.
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MyPageHead({ counts }: { counts: { orders: number; favorites: number; basket: number } }) {
  const pathname = usePathname();
  const TABS = [
    { href: "/my/orders", name: "주문 내역", count: counts.orders },
    { href: "/my/favorites", name: "좋아요", count: counts.favorites },
    { href: "/my/basket", name: "장바구니", count: counts.basket },
  ];
  return (
    <div className="margin-bottom:8">
      <h1 className="margin-bottom:5 font-size:heading-md font-weight:bold letter-spacing:tight">마이 페이지</h1>
      <nav className="m3-tabs" aria-label="마이 페이지">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`tab-item${active ? " tab-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {t.name}
              <span className={`m3-badge badge:inline badge-color:${active ? "primary" : "neutral"}`}>{t.count}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
