"use client";
// 글 편집기 — @newtil/editor (<newtil-editor>) 의 React 래퍼. Custom Element 는 브라우저에서만 등록되므로
// 쓰는 쪽에서 next/dynamic({ ssr: false }) 로 불러온다. 저장 값은 마크다운.
import "@newtil/editor";
import { NewtilEditor } from "@newtil/editor/react";

export default function MarkdownEditor({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange: (markdown: string) => void;
}) {
  return (
    <>
      <NewtilEditor value={value} onChange={(d) => onChange(d.markdown)} toolbar />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
