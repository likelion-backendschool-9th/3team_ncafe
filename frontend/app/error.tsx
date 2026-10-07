"use client";

import { StatePanel } from "./_components/ui/StatePanel";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container page-content">
      <StatePanel
        eyebrow="오류"
        title="화면을 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
        action={<button className="button" onClick={reset} type="button">다시 시도</button>}
      />
    </main>
  );
}
