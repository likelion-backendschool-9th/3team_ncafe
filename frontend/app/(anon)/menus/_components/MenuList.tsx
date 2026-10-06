import MenuCard from "../../_components/MenuCard";
import Pager from "@/app/_components/Pager";
import { Page, MenuSummary } from "@/lib/types";

interface MenuListProps {
  currentCategoryId: number | null;
  currentPrice: string | null;
}

export default async function MenuList({ currentCategoryId, currentPrice }: MenuListProps) {
  // 쿼리 파라미터 구성
  const queryParams = new URLSearchParams();
  if (currentCategoryId !== null) {
    queryParams.append("category", currentCategoryId.toString());
  }
  
    // 가격 범위 파싱 ("0-5000", "5000-7000", "7000-")
  if (currentPrice !== null) {
const [min, max] = currentPrice.split("-");
  if (min) {
  queryParams.append("minPrice", min);
    }
  if (max) {
  queryParams.append("maxPrice", max);
  }
    }

// 백엔드 API로부터 메뉴 목록 패치 (배열 형태로 반환됨)
  const res = await fetch(`http://localhost:8080/api/menus?${queryParams.toString()}`, {
  cache: "no-store", // 실시간 데이터 반영을 위해 캐시 비활성화
  });
  
  const items: MenuSummary[] = res.ok ? await res.json() : [];

    // Pager 컴포넌트에 넘겨줄 쿼리 파라미터 객체 구성
  const pagerParams: Record<string, string> = {};
if (currentCategoryId !== null) {
  pagerParams.category = currentCategoryId.toString();
    }
      if (currentPrice !== null) {
        pagerParams.price = currentPrice;
          }

        return (
          <section className="site-content">
            <div className="m3-toolbar">
              <p className="toolbar-start">
              총 <strong>{items.length}</strong>개의 메뉴
              </p>
              <div className="toolbar-end width:ex" style={{ "--width-ex": "9rem" }}>
            <div className="m3-text-field field:outlined field-label:none">
          <select name="sort" defaultValue="popular" aria-label="정렬">
        <option value="popular">인기순</option>
      <option value="latest">최신순</option>
<option value="priceAsc">낮은 가격순</option>
      <option value="priceDesc">높은 가격순</option>
        </select>
          </div>
        </div>
      </div>

          {items.length === 0 ? (
            <div className="text-align:center padding-y:12 color:text-muted">
              해당 조건에 맞는 메뉴가 존재하지 않습니다.
              </div>
              ) : (
              <ul className="m3-grid grid-cols:3">
                {items.map((m) => (
                  <MenuCard
                key={m.slug}
                  menu={m}
                heading="h2"
              badge={
              m.status === "soldout" ? (
                <span className="m3-badge badge:inline badge-color:neutral">품절</span>
                  ) : m.isNew ? (
                    <span className="m3-badge badge:inline badge-color:primary">NEW</span>
                    ) : undefined
                    }
                  actions={
                    <>
                  <button
                  type="button"
                    className="m3-icon-btn icon-btn:outlined icon-btn-size:sm"
                      aria-label="좋아요"
                    >
                  <i className="m3-icon icon:favorite" aria-hidden="true"></i>
                    </button>
                      {m.status !== "on" ? (
                    <button type="button" className="m3-btn btn-size:xs" disabled>
                  품절
                </button>
              ) : (
            <button type="button" className="m3-btn btn-size:xs">
          담기
        </button>
      )}
</>
      }
    />
  ))}
</ul>
)}

{/* 백엔드가 페이징을 지원하지 않고 전체 리스트를 반환하므로, 임시로 1페이지로 고정하여 Pager 컴포넌트를 렌더링합니다. */}
<Pager page={1} totalPages={1} href="/menus" params={pagerParams} className="margin-top:9" />
</section>
);
}
