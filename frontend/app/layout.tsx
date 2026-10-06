import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NCafe", template: "%s - NCafe" },
  description: "개발자를 위한 공유 카페 NCafe — 메뉴 조회와 온라인 주문",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Material Symbols 아이콘 폰트 — @newtil/materials 가 CSS @import 로 불러오지만 Turbopack 은 외부 @import 를 버리므로 link 로 직접 싣는다 */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
