// 메뉴 상세 — 브레드크럼 · 갤러리 + 주문 폼 · 탭(상세 설명 · 영양 정보 · 유의 사항) · 함께 보면 좋은 메뉴.
// 데이터는 lib/mock 의 MENU_DETAIL (모양 = GET /api/menus/{slug} 응답). 어느 slug 로 와도 카페라떼를 보여준다.
import Link from "next/link";
import { MENU_DETAIL } from "@/lib/mock";
import { image, won } from "@/lib/format";

const KIND_LABEL: Record<string, string> = { temperature: "온도", size: "사이즈" };
const KIND_ORDER = ["temperature", "size"];

export default function MenuDetailPage() {
  const menu = MENU_DETAIL;
  const kinds = [...new Set(menu.options.map((o) => o.kind))].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  const images = menu.images.length ? menu.images : [image(menu.imgSrc, menu.slug)];
  const paragraphs = (menu.detail || menu.description).split(/\n{2,}/).filter(Boolean);
  const n = menu.nutrition;

  return (
    <>
      {/* 브레드크럼 (가구: m3-breadcrumb) */}
      <nav className="m3-breadcrumb" aria-label="현재 위치">
        <Link href="/">홈</Link>
        <Link href="/menus">메뉴</Link>
        <Link href={`/menus?category=${menu.categoryId}`}>{menu.categoryName}</Link>
        <span aria-current="page">{menu.korName}</span>
      </nav>

      {/* ===== 상품 요약: 갤러리 + 정보(m3-form) ===== */}
      <section
        className="display:grid grid-template-columns:1 gap:7 md:grid-template-columns:ex md:gap:9 align-items:start"
        style={{ "--grid-template-columns-ex": "minmax(0, 5fr) minmax(0, 6fr)" }}
      >
        <div className="display:flex flex-direction:column gap:4">
          <div className="m3-card card:outlined">
            <div className="card-media card-media:square">
              <img src={images[0]} alt={menu.korName} />
            </div>
          </div>
          {images.length > 1 && (
            <ul className="display:flex gap:3 margin:0 padding:0 list-style-type:none">
              {images.map((src, i) => (
                <li key={src} className={`m3-card card:outlined card-clickable width:13${i === 0 ? " card-state:focused" : ""}`}>
                  <button
                    type="button"
                    className="card-media card-media:square display:block width:full padding:0 border-width:0 background-color:transparent cursor:pointer"
                    aria-pressed={i === 0}
                    aria-label={`${menu.korName} ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="display:flex flex-direction:column align-items:flex-start gap:3">
          <div className="display:flex gap:2">
            <span className="m3-badge badge:inline badge-color:neutral">{menu.categoryName}</span>
            {menu.isNew && <span className="m3-badge badge:inline badge-color:primary">NEW</span>}
            {menu.status === "soldout" && <span className="m3-badge badge:inline badge-color:warning">품절</span>}
          </div>
          <h1 className="margin:0 font-size:heading-lg font-weight:bold line-height:tight">{menu.korName}</h1>
          <p className="margin:0 font-size:body-sm color:text-muted">{menu.engName}</p>

          <div className="display:flex align-items:baseline gap:5 margin-top:2">
            <span className="font-size:heading-sm font-weight:bold">{won(menu.price)}원</span>
            <span className="display:inline-flex align-items:center gap:1 font-size:body-sm color:text-muted">
              <i className="m3-icon icon:favorite icon-size:sm" aria-hidden="true"></i>
              {menu.favoriteCount}
            </span>
          </div>

          <p className="margin:0 margin-bottom:4 font-size:body color:text-muted">{menu.description}</p>

          <form className="m3-form width:full">
            <div className="form-fields">
              {kinds.map((kind) => (
                <fieldset key={kind} className="form-group form-group:inline">
                  <legend className="form-group-label">{KIND_LABEL[kind] ?? kind}</legend>
                  <div className="form-group-choices">
                    {menu.options
                      .filter((o) => o.kind === kind)
                      .map((o) => (
                        <label key={o.name} className="m3-radio">
                          <input type="radio" name={kind} value={o.name} defaultChecked={o.isDefault} />
                          <span>
                            {o.name}
                            {o.extraPrice > 0 && <small className="form-choice-extra"> +{won(o.extraPrice)}원</small>}
                          </span>
                        </label>
                      ))}
                  </div>
                </fieldset>
              ))}

              <div className="form-group form-group:inline">
                <span className="form-group-label" id="quantity-label">
                  수량
                </span>
                <div className="m3-stepper stepper-size:lg" role="group" aria-labelledby="quantity-label">
                  <button type="button" className="stepper-btn" aria-label="수량 감소">
                    <i className="m3-icon icon:remove" aria-hidden="true"></i>
                  </button>
                  <input className="stepper-input" type="number" name="quantity" defaultValue={1} min={1} aria-label="수량" />
                  <button type="button" className="stepper-btn" aria-label="수량 증가">
                    <i className="m3-icon icon:add" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>

            <hr className="m3-divider" />

            <div className="display:flex align-items:baseline justify-content:space-between font-size:body-sm color:text-muted">
              <span>총 상품 금액</span>
              <strong className="font-size:heading-md font-weight:bold color:text">{won(menu.price)}원</strong>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className={`m3-icon-btn icon-btn:outlined${menu.favorite ? " icon-btn-toggle:selected" : ""}`}
                aria-pressed={menu.favorite}
                aria-label={menu.favorite ? "좋아요 취소" : "좋아요"}
              >
                <i className={`m3-icon icon:favorite${menu.favorite ? " icon-filled:1" : ""}`} aria-hidden="true"></i>
              </button>
              <button type="submit" className="m3-btn btn:outlined btn-size:md flex:1" disabled={menu.status !== "on"}>
                {menu.status === "on" ? "장바구니 담기" : "품절"}
              </button>
              <button type="button" className="m3-btn btn-size:md flex:1" disabled={menu.status !== "on"}>
                바로 주문
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ===== 상세 정보: m3-tabs + 본문 블록 ===== */}
      <section className="margin-top:11">
        <nav className="m3-tabs" aria-label="상세 정보">
          <a href="#description" className="tab-item tab-active">
            상세 설명
          </a>
          {n && (
            <a href="#nutrition" className="tab-item">
              영양 정보
            </a>
          )}
          {menu.notices.length > 0 && (
            <a href="#notice" className="tab-item">
              유의 사항
            </a>
          )}
        </nav>

        <article id="description" className="m3-section section:divided">
          <h2 className="section-title">상세 설명</h2>
          <div className="section-body">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>

        {n && (
          <article id="nutrition" className="m3-section section:divided">
            <h2 className="section-title">영양 정보</h2>
            <p className="section-caption">Regular 사이즈 기준</p>
            <table className="m3-table table:key-value" style={{ "--table-max-width": "40rem" }}>
              <tbody>
                <tr>
                  <th scope="row">칼로리</th>
                  <td>{n.kcal ?? "-"} kcal</td>
                  <th scope="row">나트륨</th>
                  <td>{n.sodiumMg ?? "-"} mg</td>
                </tr>
                <tr>
                  <th scope="row">당류</th>
                  <td>{n.sugarG ?? "-"} g</td>
                  <th scope="row">포화지방</th>
                  <td>{n.satFatG ?? "-"} g</td>
                </tr>
                <tr>
                  <th scope="row">단백질</th>
                  <td>{n.proteinG ?? "-"} g</td>
                  <th scope="row">카페인</th>
                  <td>{n.caffeineMg ?? "-"} mg</td>
                </tr>
              </tbody>
            </table>
          </article>
        )}

        {menu.notices.length > 0 && (
          <article id="notice" className="m3-section section:divided">
            <h2 className="section-title">유의 사항</h2>
            <div className="section-body">
              <ul>
                {menu.notices.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </article>
        )}
      </section>

      {/* ===== 함께 보면 좋은 메뉴: m3-toolbar + m3-grid(m3-card) ===== */}
      {menu.related.length > 0 && (
        <section className="margin-top:11">
          <div className="m3-toolbar">
            <div className="toolbar-start">
              <h2 className="margin:0 font-size:heading-sm font-weight:bold color:text">함께 보면 좋은 메뉴</h2>
            </div>
            <div className="toolbar-end">
              <Link href={`/menus?category=${menu.categoryId}`} className="m3-btn btn:text btn-size:xs">
                {menu.categoryName} 전체 보기 →
              </Link>
            </div>
          </div>
          <ul className="m3-grid grid-cols:4">
            {menu.related.map((m) => (
              <li key={m.slug} className="m3-card card:outlined card-size:compact">
                <Link href={`/menus/${m.slug}`} className="card-media card-media:square">
                  <img src={image(m.imgSrc, m.slug)} alt={m.korName} />
                </Link>
                <div className="card-header">
                  <div className="card-titles">
                    <h3 className="card-headline">
                      <Link href={`/menus/${m.slug}`}>{m.korName}</Link>
                    </h3>
                  </div>
                </div>
                <div className="card-actions">
                  <strong className="font-size:heading-sm font-weight:bold">{won(m.price)}원</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
