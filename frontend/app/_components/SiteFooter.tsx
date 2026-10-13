import { BrandLogo } from './BrandLogo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <BrandLogo compact />
        <address className="site-footer__info" aria-label="매장 안내">
          <span>서울 어딘가 카페거리 12길 3</span>
          <span>매일 09:00 – 22:00</span>
          <span>전화 02-1234-5678</span>
        </address>
        <span>© 삼다방. All rights reserved.</span>
      </div>
    </footer>
  );
}
