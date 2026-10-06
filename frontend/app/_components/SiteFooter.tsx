// 공개 사이트 푸터 — 방(m3-site)의 site-footer 슬롯.
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer-inner">
        <p className="site-copyright">
          <strong className="margin-right:2 color:primary">NCafe</strong> © 2026 NCafe. All rights reserved.
        </p>
        <nav className="site-footer-links" aria-label="바닥글 링크">
          <Link href="/about">소개</Link>
          <Link href="/">이용약관</Link>
          <Link href="/">개인정보처리방침</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </div>
    </footer>
  );
}
