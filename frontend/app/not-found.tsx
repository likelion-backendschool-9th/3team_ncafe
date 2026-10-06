// 404 — 방 없이 가운데 안내만. 레이아웃(헤더·푸터)은 (anon) 그룹 밖이라 직접 최소 구성.
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="m3-site">
      <header className="site-header">
        <div className="site-container site-header-inner">
          <Link href="/" className="site-logo">
            NCafe
          </Link>
        </div>
      </header>
      <main className="site-main">
        <div className="site-container text-align:center padding-y:11">
          <p className="font-size:display font-weight:bold color:primary line-height:tight">404</p>
          <h1 className="margin-top:4 font-size:heading-md font-weight:bold letter-spacing:tight">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="margin-top:3 color:text-muted">
            주소가 잘못 입력되었거나, 페이지가 삭제 또는 이동되었을 수 있습니다.
          </p>
          <div className="display:flex justify-content:center gap:3 margin-top:7">
            <Link href="/" className="m3-btn">
              홈으로 가기
            </Link>
            <Link href="/menus" className="m3-btn btn:outlined">
              메뉴 보러가기
            </Link>
          </div>
        </div>
      </main>
      <footer className="site-footer">
        <div className="site-container site-footer-inner">
          <p className="site-copyright">© 2026 NCafe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
