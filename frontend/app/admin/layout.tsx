// 관리자 방 — m3-layout (드로어 + 상단 앱 바 + 본문). 페이지는 layout-content 안만 만든다.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminNav from "./_components/AdminNav";
import { ADMIN } from "@/lib/mock";

export const metadata: Metadata = { title: { default: "관리자", template: "%s - NCafe 관리자" } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="m3-layout layout:fixed-drawer">
      <AdminNav />
      <div className="layout-main">
        <header className="m3-top-app-bar layout-header bar:outlined">
          <span className="bar-title">관리자</span>
          <div className="bar-trailing">
            <span className="font-size:body-sm font-weight:semibold">{ADMIN.name}</span>
            <button type="button" className="m3-btn btn:outlined btn-size:xs">
              로그아웃
            </button>
          </div>
        </header>
        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
}
