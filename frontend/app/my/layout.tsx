// 마이 페이지의 방 — 같은 m3-site 이지만 헤더가 로그인 상태(이름·로그아웃)이고, 본문 위에 "마이 페이지" 제목과 탭이 놓인다.
// 사용자·개수는 lib/mock (나중에 세션·API 로).
import type { ReactNode } from "react";
import SiteHeader from "../_components/SiteHeader";
import SiteFooter from "../_components/SiteFooter";
import MyPageHead from "./_components/MyPageHead";
import { BASKET, FAVORITES, ORDERS, USER } from "@/lib/mock";

export default function MyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="m3-site site-aside:lg">
      <SiteHeader user={USER} basketCount={BASKET.items.length} />
      <main className="site-main">
        <div className="site-container">
          <MyPageHead counts={{ orders: ORDERS.length, favorites: FAVORITES.length, basket: BASKET.items.length }} />
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
