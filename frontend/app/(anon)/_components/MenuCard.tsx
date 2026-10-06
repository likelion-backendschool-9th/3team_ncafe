// 메뉴 카드 — 홈(인기 메뉴)·메뉴 목록·상세(관련 메뉴)가 같이 쓰는 m3-card. 사진(4:3) · 카테고리 · 이름 · 영문명 · 가격 · 동작.
// 사진 위 표시(순위·NEW·품절)는 badge, 오른쪽 동작(하트·담기)은 actions 로 넣는다. 값은 백엔드의 MenuSummary 그대로.
import Link from "next/link";
import type { ReactNode } from "react";
import { image, won } from "@/lib/format";
import type { MenuSummary } from "@/lib/types";

export default function MenuCard({
  menu,
  badge,
  actions,
  heading = "h3",
}: {
  menu: MenuSummary;
  badge?: ReactNode;
  actions?: ReactNode;
  heading?: "h2" | "h3";
}) {
  const H = heading;
  const href = `/menus/${menu.slug}`;
  return (
    <li className="m3-card card:outlined card-size:compact">
      <Link href={href} className="card-media card-media:landscape">
        <img src={image(menu.imgSrc, menu.slug)} alt={menu.korName} />
        {badge && <span className="card-media-badge">{badge}</span>}
      </Link>
      <div className="card-header">
        <div className="card-titles">
          <p className="card-subhead">{menu.categoryName}</p>
          <H className="card-headline">
            <Link href={href}>{menu.korName}</Link>
          </H>
        </div>
      </div>
      <p className="card-content">{menu.engName}</p>
      <div className="card-actions">
        <strong className="font-size:body-lg font-weight:bold">{won(menu.price)}원</strong>
        {actions && <div className="card-actions-end">{actions}</div>}
      </div>
    </li>
  );
}
