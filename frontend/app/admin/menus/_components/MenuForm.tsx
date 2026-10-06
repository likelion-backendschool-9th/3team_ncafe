"use client";
// 메뉴 등록·수정 공용 폼 — m3-form + m3-section(section:card) + m3-text-field(field:outlined field-label:top) + form-group.
// "설명" 은 textarea 대신 newtil 편집기(마크다운 저장). <newtil-editor> 는 브라우저에서만 등록되므로 ssr:false 로 불러온다.
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/mock";

const MarkdownEditor = dynamic(() => import("../../_components/MarkdownEditor"), { ssr: false });

export type MenuStatus = "on" | "soldout" | "hidden";

export type MenuFormValues = {
  korName: string;
  engName: string;
  categoryId: string;
  price: string;
  description: string;
  status: MenuStatus;
  hot: boolean;
  ice: boolean;
  large: boolean;
  isNew: boolean;
  image?: { src: string; alt: string; meta: string };
};

type MenuFormProps =
  | { mode: "create"; initial?: undefined; cancelHref: string }
  | { mode: "edit"; initial: MenuFormValues; cancelHref: string };


const STATUSES: { value: MenuStatus; label: string }[] = [
  { value: "on", label: "판매 중" },
  { value: "soldout", label: "품절" },
  { value: "hidden", label: "비공개" },
];

const EMPTY: MenuFormValues = {
  korName: "",
  engName: "",
  categoryId: "",
  price: "",
  description: "",
  status: "on",
  hot: true,
  ice: true,
  large: false,
  isNew: false,
};

const OPTIONS: { name: "hot" | "ice" | "large"; label: string }[] = [
  { name: "hot", label: "HOT" },
  { name: "ice", label: "ICE" },
  { name: "large", label: "Large 사이즈" },
];

/* 토큰 단계 밖의 값 — 두 단 폼(1fr 340px)·폼 최대 폭·40px 입력 상자 높이 */
const FORM_COLUMNS = { "--grid-template-columns-ex": "1fr 340px" } as CSSProperties;
const FORM_WIDTH = { "--max-width-ex": "65rem" } as CSSProperties;
const INPUT_HEIGHT = { "--height-ex": "2.5rem" } as CSSProperties;
const IMAGE_RATIO = { "--aspect-ratio-ex": "4 / 3" } as CSSProperties;

function Required() {
  return <span className="color:danger">*</span>;
}

export default function MenuForm({ mode, initial, cancelHref }: MenuFormProps) {
  const values = initial ?? EMPTY;
  const [description, setDescription] = useState(values.description);

  return (
    <form className="m3-form max-width:ex" style={FORM_WIDTH}>
      <div
        className="display:grid grid-template-columns:1 lg:grid-template-columns:ex gap:6 align-items:start"
        style={FORM_COLUMNS}
      >
        {/* ===== 기본 정보 ===== */}
        <section className="m3-section section:card">
          <h2 className="section-title">기본 정보</h2>
          <div className="form-fields">
            <div className="display:grid grid-template-columns:1 md:grid-template-columns:2 gap:5">
              <div className="m3-text-field field:outlined field-label:top">
                <label htmlFor="korName">
                  메뉴명(한글) <Required />
                </label>
                <input
                  id="korName"
                  name="korName"
                  type="text"
                  placeholder={mode === "create" ? "예) 카페라떼" : undefined}
                  defaultValue={values.korName}
                />
              </div>
              <div className="m3-text-field field:outlined field-label:top">
                <label htmlFor="engName">
                  메뉴명(영문) <Required />
                </label>
                <input
                  id="engName"
                  name="engName"
                  type="text"
                  placeholder={mode === "create" ? "예) Caffe Latte" : undefined}
                  defaultValue={values.engName}
                />
              </div>
            </div>

            <div className="display:grid grid-template-columns:1 md:grid-template-columns:2 gap:5">
              <div className="m3-text-field field:outlined field-label:top">
                <label htmlFor="categoryId">
                  카테고리 <Required />
                </label>
                <select id="categoryId" name="categoryId" defaultValue={values.categoryId}>
                  {mode === "create" && (
                    <option value="" disabled>
                      카테고리 선택
                    </option>
                  )}
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="display:flex align-items:flex-end gap:2">
                <div className="m3-text-field field:outlined field-label:top flex:1">
                  <label htmlFor="price">
                    가격 <Required />
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    placeholder={mode === "create" ? "0" : undefined}
                    defaultValue={values.price}
                    min={0}
                    step={100}
                  />
                </div>
                <span
                  className="display:flex align-items:center height:ex font-size:body-sm color:text-muted"
                  style={INPUT_HEIGHT}
                >
                  원
                </span>
              </div>
            </div>

            {/* 설명 — newtil 편집기 (마크다운 저장) */}
            <div className="form-group">
              <span className="form-group-label">설명</span>
              <MarkdownEditor name="description" value={description} onChange={setDescription} />
              <p className="font-size:caption color:text-muted">사용자 화면의 메뉴 상세 페이지에 노출됩니다.</p>
            </div>
          </div>
        </section>

        {/* ===== 이미지 / 판매 설정 ===== */}
        <div className="display:flex flex-direction:column gap:6">
          <section className="m3-section section:card">
            <h2 className="section-title">대표 이미지</h2>
            {values.image ? (
              <div>
                <div
                  className="aspect-ratio:ex overflow:hidden border-radius:3 background-color:surface-1"
                  style={IMAGE_RATIO}
                >
                  <img
                    src={values.image.src}
                    alt={values.image.alt}
                    className="width:full height:full object-fit:cover"
                  />
                </div>
                <div className="display:flex gap:3 margin-top:4">
                  <label htmlFor="imgSrc" className="m3-btn btn:outlined btn-size:xs">
                    이미지 변경
                    <input id="imgSrc" name="imgSrc" type="file" accept="image/*" className="display:none" />
                  </label>
                  <button type="button" className="m3-btn btn:text btn-size:xs">
                    삭제
                  </button>
                </div>
                <p className="margin-top:3 font-size:caption color:text-muted">{values.image.meta}</p>
              </div>
            ) : (
              <label
                htmlFor="imgSrc"
                className="display:flex flex-direction:column align-items:center justify-content:center gap:2 padding-y:8 padding-x:5 border-width:1 border-style:dashed border-color:border border-radius:3 background-color:surface-1 text-align:center cursor:pointer hover:border-color:primary hover:background-color:primary-subtle"
              >
                <span className="font-size:heading-sm color:primary">⬆</span>
                <span className="font-size:body-sm font-weight:semibold">이미지를 드래그하거나 클릭하여 업로드</span>
                <span className="font-size:caption color:text-muted">PNG, JPG · 최대 5MB · 권장 800×600</span>
                <input id="imgSrc" name="imgSrc" type="file" accept="image/*" className="display:none" />
              </label>
            )}
          </section>

          <section className="m3-section section:card">
            <h2 className="section-title">판매 설정</h2>
            <div className="form-fields">
              <fieldset className="form-group">
                <legend className="form-group-label">판매 상태</legend>
                <div className="form-group-choices">
                  {STATUSES.map((s) => (
                    <label key={s.value} className="m3-radio">
                      <input type="radio" name="status" value={s.value} defaultChecked={values.status === s.value} />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="form-group">
                <legend className="form-group-label">제공 옵션</legend>
                <div className="form-group-choices">
                  {OPTIONS.map((o) => (
                    <label key={o.name} className="m3-checkbox">
                      <input type="checkbox" name={o.name} defaultChecked={values[o.name]} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label className="m3-switch">
                  <input type="checkbox" name="isNew" defaultChecked={values.isNew} />
                  <span className="switch-label">신메뉴로 표시</span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ===== 하단 액션 ===== */}
      {mode === "create" ? (
        <div className="form-actions form-actions:end">
          <Link href={cancelHref} className="m3-btn btn:outlined">
            취소
          </Link>
          <button type="submit" className="m3-btn">
            등록하기
          </button>
        </div>
      ) : (
        <div className="form-actions form-actions:between">
          <button type="button" className="m3-btn btn:outlined btn-color:danger">
            메뉴 삭제
          </button>
          <div className="display:flex gap:3">
            <Link href={cancelHref} className="m3-btn btn:outlined">
              취소
            </Link>
            <button type="submit" className="m3-btn">
              저장하기
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
