// 좋아요 — m3-card + m3-toolbar + m3-list(ItemRow). 데이터는 lib/mock 의 FAVORITES (모양 = GET /api/my/favorites).
import { Fragment } from "react";
import ItemRow from "../_components/ItemRow";
import { FAVORITES } from "@/lib/mock";
import { date, won } from "@/lib/format";

export default function MyFavoritesPage() {
  return (
    /* ===== 좋아요 목록 (가구: m3-card + m3-toolbar + m3-list) ===== */
    <section className="m3-card card:outlined" aria-label="좋아요 목록">
      <div className="m3-toolbar toolbar:card">
        <div className="toolbar-start">
          <label className="m3-checkbox">
            <input type="checkbox" /> 전체 선택
          </label>
        </div>
        <div className="toolbar-end">
          <button type="button" className="m3-btn btn:outlined btn-size:xs">
            선택 장바구니 담기
          </button>
          <button type="button" className="m3-btn btn:text btn-size:xs">
            선택 삭제
          </button>
        </div>
      </div>

      <ul className="m3-list">
        {FAVORITES.map(({ menu, createdAt }, i) => (
          <Fragment key={menu.id}>
            {i > 0 && <li className="list-divider" role="separator" />}
            <ItemRow
              slug={menu.slug}
              name={menu.korName}
              thumb="landscape"
              soldOut={menu.status !== "on"}
              overline={menu.categoryName}
              trailing={
                <div className="display:flex flex-direction:column align-items:flex-end gap:3">
                  <strong className="font-weight:bold">{won(menu.price)}원</strong>
                  <div className="display:flex gap:2">
                    <button type="button" className="m3-btn btn-size:xs" disabled={menu.status !== "on"}>
                      {menu.status !== "on" ? "품절" : "장바구니 담기"}
                    </button>
                    <button
                      type="button"
                      className="m3-btn btn:outlined btn-color:danger btn-size:xs"
                      aria-label="좋아요 취소"
                    >
                      ♥ 취소
                    </button>
                  </div>
                </div>
              }
            >
              <p className="list-supporting">{menu.engName}</p>
              <p className="list-supporting margin-top:2 font-size:caption">{date(createdAt)} 좋아요</p>
            </ItemRow>
          </Fragment>
        ))}
      </ul>

      <hr className="m3-divider" />
      <div className="card-actions padding-top:4">
        <p className="font-size:body-sm color:text-muted">총 {FAVORITES.length}개의 메뉴를 좋아합니다.</p>
      </div>
    </section>
  );
}
