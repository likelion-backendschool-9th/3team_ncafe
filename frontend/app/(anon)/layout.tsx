// 공개 페이지의 방 — m3-site. 헤더(로그아웃 상태)·푸터는 여기 한 번만 있고 페이지는 site-container 안 내용만 만든다.
import type { ReactNode } from "react";
import SiteHeader from "../_components/SiteHeader";
import SiteFooter from "../_components/SiteFooter";

export default function AnonLayout({ children }: { children: ReactNode }) {
  return (
    <div className="m3-site">
      <SiteHeader user={null} />
      <main className="site-main">
        <div className="site-container">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
