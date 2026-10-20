import type { ReactNode } from "react";
import { requireRole } from "@/app/_lib/session/session";
import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "/admin");
  return (
    <div className="container workspace workspace--wide">
      <aside className="workspace__sidebar">
        <p id="admin-nav-title" className="workspace__sidebar-title">관리자</p>
        <AdminNav />
        <p className="workspace__sidebar-note">다른 관리 기능은 이후 단계에서 연결합니다.</p>
      </aside>
      <main className="workspace__main">{children}</main>
    </div>
  );
}
