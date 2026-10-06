// 홈 — 히어로 · 카테고리(m3-grid + m3-card) · 인기 메뉴(m3-grid + MenuCard) · 매장 안내(m3-grid + m3-card).
// 데이터는 lib/mock (모양 = 백엔드 DTO).
import Link from "next/link";
import MenuCard from "./_components/MenuCard";
import { CATEGORIES, MENUS } from "@/lib/mock";

const ICONS: Record<number, string> = { 1: "☕", 2: "🍵", 3: "🥤", 4: "🍰" };

// "인기" = 좋아요 수가 많은 순 4개 (API 도 같은 목록에서 프론트가 고른다)
const POPULAR = [...MENUS.items].sort((a, b) => b.favoriteCount - a.favoriteCount).slice(0, 4);

const INFOS = [
  { title: "영업 시간", lines: ["평일 07:30 – 21:00", "주말 · 공휴일 09:00 – 20:00"] },
  { title: "매장 위치", lines: ["서울특별시 강남구 테헤란로 123", "뉴렉처빌딩 1층"] },
  { title: "고객센터", lines: ["02-1234-5678", "help@ncafe.com"] },
];

export default function HomePage() {
  return (
    <div className="display:flex flex-direction:column gap:11">
      {/* ----- 히어로: 글 + 그림 2단 (규격 없음 → 유틸리티) ----- */}
      <section
        className="display:grid grid-template-columns:1 md:grid-template-columns:ex gap:9 align-items:center padding-y:8"
        style={{ "--grid-template-columns-ex": "1.1fr 0.9fr" }}
      >
        <div>
          <span className="m3-badge badge:inline badge-color:primary">NEW SEASON</span>
          <h1 className="margin-top:5 font-size:heading-lg md:font-size:heading-xl font-weight:bold line-height:tight letter-spacing:tight">
            매일 아침,
            <br />갓 내린 커피 한 잔의 여유
          </h1>
          <p
            className="max-width:ex margin-top:6 font-size:body-lg color:text-muted"
            style={{ "--max-width-ex": "30rem" }}
          >
            NCafe는 엄선한 원두와 정직한 레시피로 만든 음료를 온라인으로 간편하게 주문할 수 있는 서비스입니다.
          </p>
          <div className="display:flex gap:3 margin-top:8">
            <Link href="/menus" className="m3-btn">
              메뉴 보러가기
            </Link>
            <Link href="/my/basket" className="m3-btn btn:outlined">
              장바구니 확인
            </Link>
          </div>
        </div>
        <div className="border-radius:5 overflow:hidden box-shadow:md">
          <img src="/images/menus/latte.svg" alt="" className="width:full" />
        </div>
      </section>

      {/* ----- 카테고리 ----- */}
      <section>
        <div className="margin-bottom:7">
          <h2 className="font-size:heading-md font-weight:bold letter-spacing:tight">카테고리</h2>
          <p className="margin-top:2 font-size:body-sm color:text-muted">취향에 맞는 음료를 찾아보세요.</p>
        </div>
        <ul className="m3-grid grid-cols:4 grid-gap:3">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="m3-card card:outlined card-clickable card-padding:self">
              <Link href={`/menus?category=${c.id}`} className="display:flex flex-direction:column gap:1">
                <span className="font-size:heading-md margin-bottom:2" aria-hidden="true">
                  {ICONS[c.id]}
                </span>
                <span className="font-weight:bold">{c.name}</span>
                <span className="font-size:body-sm color:text-muted">{c.count}개 메뉴</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ----- 인기 메뉴 ----- */}
      <section>
        <div className="display:flex align-items:flex-end justify-content:space-between gap:4 margin-bottom:7">
          <div>
            <h2 className="font-size:heading-md font-weight:bold letter-spacing:tight">인기 메뉴</h2>
            <p className="margin-top:2 font-size:body-sm color:text-muted">좋아요를 가장 많이 받은 메뉴입니다.</p>
          </div>
          <Link href="/menus" className="m3-btn btn:text btn-size:xs">
            전체 보기 →
          </Link>
        </div>
        <ol className="m3-grid grid-cols:4">
          {POPULAR.map((m, i) => (
            <MenuCard
              key={m.slug}
              menu={m}
              badge={<span className="m3-badge badge:inline badge-color:neutral">{i + 1}</span>}
              actions={
                <button
                  type="button"
                  className="m3-btn btn:outlined btn-size:xs btn-icon:leading"
                  aria-label={`좋아요 ${m.favoriteCount}`}
                >
                  <i className="m3-icon icon:favorite" aria-hidden="true"></i>
                  {m.favoriteCount}
                </button>
              }
            />
          ))}
        </ol>
      </section>

      {/* ----- 매장 안내 ----- */}
      <section aria-label="매장 안내">
        <ul className="m3-grid grid-cols:3 grid-gap:3">
          {INFOS.map((info) => (
            <li key={info.title} className="m3-card card:outlined card-padding:self">
              <h3 className="margin-bottom:2 font-size:body-sm font-weight:bold color:text-muted">{info.title}</h3>
              <p className="line-height:loose">
                {info.lines[0]}
                <br />
                {info.lines[1]}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
