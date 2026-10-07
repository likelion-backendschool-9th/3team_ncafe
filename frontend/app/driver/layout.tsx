import type { ReactNode } from "react";
import Link from "next/link";
import { requireRole } from "@/app/_lib/session/session";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  await requireRole("driver", "/driver");
  return (
    <div className="container workspace">
      <aside className="workspace__sidebar" aria-label="배달기사 메뉴">
        <p className="eyebrow">배달기사</p>
        <Link href="/driver">기사 홈</Link>
        <span className="muted">담당 배달은 6단계에서 연결합니다.</span>
      </aside>
      <main className="workspace__main">{children}</main>
    </div>
  );
}
