// 페이지 이동 — m3-pager. 현재 필터(URLSearchParams)를 그대로 두고 page 만 바꾼 링크를 만든다.
import Link from "next/link";

export default function Pager({
  page,
  totalPages,
  href,
  params,
  className = "",
}: {
  page: number;
  totalPages: number;
  href: string;
  params: Record<string, string | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const to = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("page", String(n));
    return `${href}?${q}`;
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className={`m3-pager ${className}`} aria-label="페이지 이동">
      <Link
        href={to(Math.max(1, page - 1))}
        className="pager-item pager-prev"
        aria-disabled={page === 1 || undefined}
        tabIndex={page === 1 ? -1 : undefined}
      >
        이전
      </Link>
      {pages.map((n) => (
        <Link key={n} href={to(n)} className="pager-item" aria-current={n === page ? "page" : undefined}>
          {n}
        </Link>
      ))}
      <Link
        href={to(Math.min(totalPages, page + 1))}
        className="pager-item pager-next"
        aria-disabled={page === totalPages || undefined}
        tabIndex={page === totalPages ? -1 : undefined}
      >
        다음
      </Link>
    </nav>
  );
}
