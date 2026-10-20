type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-logo${compact ? " brand-logo--compact" : ""} ${className}`}>
      <span className="brand-logo__top">COFFEE SHOP · SINCE 1987</span>
      <span className="brand-logo__main">
        <svg className="brand-logo__cup" viewBox="6 4 37 36" fill="none" aria-hidden="true">
          <path d="M12 17h20v10c0 5-4 8-10 8s-10-3-10-8V17Z" stroke="currentColor" strokeWidth="2.5" />
          <path d="M32 20h3a5 5 0 0 1 0 10h-3M9 37h26M17 13c-3-3 2-4 0-7m7 7c-3-3 2-4 0-7m7 7c-3-3 2-4 0-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <strong>삼다방</strong>
      </span>
    </span>
  );
}
