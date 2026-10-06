// 장바구니 — 목록(m3-card + m3-toolbar + m3-list) + 주문 요약(m3-card + m3-form). 데이터는 lib/mock 의 BASKET (모양 = GET /api/my/basket).
import { Fragment } from "react";
import Link from "next/link";
import ItemRow from "../_components/ItemRow";
import { BASKET } from "@/lib/mock";
import { optionSummary, won } from "@/lib/format";

const DISCOUNT = 1000;   // 쿠폰 WELCOME (할인은 주문할 때 서버가 계산한다)

export default function MyBasketPage() {
  return (
    <div className="site-body site-body:aside-end">
      {/* ===== 장바구니 목록 (가구: m3-card + m3-toolbar + m3-list) ===== */}
      <section className="site-content m3-card card:outlined" aria-label="장바구니 목록">
        <div className="m3-toolbar toolbar:card">
          <div className="toolbar-start">
            <label className="m3-checkbox">
              <input type="checkbox" defaultChecked /> 전체 선택 ({BASKET.items.length}/{BASKET.items.length})
            </label>
          </div>
          <div className="toolbar-end">
            <button type="button" className="m3-btn btn:outlined btn-color:danger btn-size:xs">
              선택 삭제
            </button>
          </div>
        </div>

        <ul className="m3-list">
          {BASKET.items.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && <li className="list-divider" role="separator" />}
              <ItemRow
                slug={item.slug}
                name={item.korName}
                soldOut={!item.orderable}
                checked
                trailing={
                  <>
                    <div className="m3-stepper" role="group" aria-label="수량">
                      <button type="button" className="stepper-btn" aria-label="수량 감소">
                        <i className="m3-icon icon:remove" aria-hidden="true"></i>
                      </button>
                      <input
                        className="stepper-input"
                        type="number"
                        defaultValue={item.quantity}
                        min={1}
                        aria-label="수량"
                      />
                      <button type="button" className="stepper-btn" aria-label="수량 증가">
                        <i className="m3-icon icon:add" aria-hidden="true"></i>
                      </button>
                    </div>
                    <div className="display:flex align-items:center gap:2">
                      <strong
                        className="min-width:ex text-align:right font-weight:bold"
                        style={{ "--min-width-ex": "5rem" }}
                      >
                        {won(item.price)}원
                      </strong>
                      <button type="button" className="m3-icon-btn icon-btn-size:sm" aria-label="삭제">
                        <i className="m3-icon icon:close" aria-hidden="true"></i>
                      </button>
                    </div>
                  </>
                }
              >
                <p className="list-supporting">{optionSummary(item.temperature, item.size)}</p>
                <p className="list-supporting">{won(item.unitPrice)}원</p>
              </ItemRow>
            </Fragment>
          ))}
        </ul>

        <hr className="m3-divider" />
        <div className="card-actions">
          <Link href="/menus" className="m3-btn btn:text btn-icon:leading">
            <i className="m3-icon icon:arrow_back" aria-hidden="true"></i>
            메뉴 더 담기
          </Link>
        </div>
      </section>

      {/* ===== 주문 요약 (가구: m3-card + m3-form) ===== */}
      <aside className="site-aside">
        <section className="m3-card card:outlined card-padding:self" aria-label="주문 요약">
          <div className="card-header">
            <div className="card-titles">
              <h2 className="card-headline">주문 요약</h2>
            </div>
          </div>

          <form className="m3-form form:compact">
            <dl className="display:flex flex-direction:column gap:3 margin:0 font-size:body-sm">
              <div className="display:flex justify-content:space-between gap:3">
                <dt className="color:text-muted">선택한 메뉴</dt>
                <dd className="margin:0 font-weight:medium">{BASKET.items.length}개</dd>
              </div>
              <div className="display:flex justify-content:space-between gap:3">
                <dt className="color:text-muted">상품 금액</dt>
                <dd className="margin:0 font-weight:medium">{won(BASKET.itemTotal)}원</dd>
              </div>
              <div className="display:flex justify-content:space-between gap:3">
                <dt className="color:text-muted">할인</dt>
                <dd className="margin:0 font-weight:medium color:danger">−{won(DISCOUNT)}원</dd>
              </div>
            </dl>

            <hr className="m3-divider" />

            <p className="display:flex justify-content:space-between align-items:baseline gap:3 font-size:body-sm font-weight:semibold">
              <span>총 결제 금액</span>
              <strong className="font-size:heading-sm font-weight:bold color:primary">{won(BASKET.itemTotal - DISCOUNT)}원</strong>
            </p>

            <div className="form-fields">
              <div className="m3-toolbar toolbar:fill">
                <div className="m3-text-field field:outlined field-label:none toolbar-grow">
                  <input type="text" name="coupon" placeholder="쿠폰 코드 입력" defaultValue="WELCOME" />
                </div>
                <button type="button" className="m3-btn btn:outlined">
                  적용
                </button>
              </div>

              <fieldset className="form-group">
                <legend className="form-group-label">수령 방법</legend>
                <label className="m3-radio">
                  <input type="radio" name="pickup" value="store" defaultChecked />
                  <span>매장 픽업</span>
                </label>
                <label className="m3-radio">
                  <input type="radio" name="pickup" value="takeout" />
                  <span>테이크아웃</span>
                </label>
              </fieldset>
            </div>

            <div className="form-actions form-actions:stretch">
              <button type="button" className="m3-btn btn-size:md">
                {won(BASKET.itemTotal - DISCOUNT)}원 주문하기
              </button>
            </div>

            <p className="form-message form-message:info">주문 후 30분 이내 매장에서 수령해 주세요.</p>
          </form>
        </section>
      </aside>
    </div>
  );
}
