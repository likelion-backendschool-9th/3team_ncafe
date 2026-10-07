import type { ReactNode } from "react";
import Link from "next/link";
import { requireRole } from "@/app/_lib/session/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "/admin");
  return (
    <div className="container workspace workspace--wide">
      <aside className="workspace__sidebar" aria-label="관리자 메뉴">
        <p className="eyebrow">관리자</p>
        <Link href="/admin">관리자 홈</Link>
        <Link href="/admin/menus">메뉴 목록</Link>
        <span className="muted">다른 관리 기능은 이후 단계에서 연결합니다.</span>
      </aside>
      <main className="workspace__main">{children}</main>
    </div>
  );
}
