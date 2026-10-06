// 좋아요·장바구니 목록의 한 줄 — 선택 · 썸네일 · 본문(이름 링크 + 보조 줄) · 뒤 요소(수량·가격·동작).
// m3-list 의 list-item 위에 놓인다. 구분선(list-divider)은 쓰는 쪽이 항목 사이에 넣는다.
import type { ReactNode } from "react";
import Link from "next/link";

export type ItemRowProps = {
  slug: string;
  name: string;
  /** 썸네일 모양 — square: 장바구니 64px 정사각(기본) · landscape: 좋아요 112×84(4:3) */
  thumb?: "square" | "landscape";
  /** 품절 — 썸네일 흐리게 + "품절" 배지 */
  soldOut?: boolean;
  /** 선택 체크박스 초기값 */
  checked?: boolean;
  /** 이름 위 한 줄(분야) */
  overline?: ReactNode;
  /** 이름 아래 보조 줄들(list-supporting) */
  children?: ReactNode;
  /** 뒤 요소 — 수량·가격·동작 버튼 */
  trailing: ReactNode;
};

const THUMB = {
  square: "width:11 aspect-ratio:square",
  landscape: "width:ex aspect-ratio:4-3",
} as const;

export default function ItemRow({
  slug,
  name,
  thumb = "square",
  soldOut = false,
  checked = false,
  overline,
  children,
  trailing,
}: ItemRowProps) {
  const href = `/menus/${slug}`;
  return (
    <li className="list-item flex-wrap:wrap">
      <label className="m3-checkbox">
        <input type="checkbox" defaultChecked={checked} aria-label="선택" />
      </label>
      <Link
        href={href}
        className={`position:relative flex-shrink:0 ${THUMB[thumb]} overflow:hidden border-radius:3 background-color:surface-2`}
        style={thumb === "landscape" ? { "--width-ex": "7rem" } : undefined}
      >
        <img
          src={`/images/menus/${slug}.svg`}
          alt={name}
          className={["width:full height:full object-fit:cover", soldOut && "opacity:50"].filter(Boolean).join(" ")}
        />
        {soldOut && (
          <span className="m3-badge badge:inline badge-color:neutral position:absolute top:2 left:2">품절</span>
        )}
      </Link>
      <div className="list-content">
        {overline && <span className="font-size:caption font-weight:semibold color:primary">{overline}</span>}
        <h2 className="list-headline">
          <Link href={href} className="hover:text-decoration:underline">
            {name}
          </Link>
        </h2>
        {children}
      </div>
      {trailing}
    </li>
  );
}
