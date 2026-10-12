import { BrandLogo } from './BrandLogo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <BrandLogo compact />
        <span>© 삼다방. All rights reserved.</span>
      </div>
    </footer>
  );
}
