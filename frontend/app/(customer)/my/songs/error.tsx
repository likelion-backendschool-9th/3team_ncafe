"use client";

import { StatePanel } from "@/app/_components/ui/StatePanel";

export default function MySongsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <StatePanel
      eyebrow="나의 신청곡"
      title="신청곡을 불러오지 못했습니다"
      description="잠시 후 다시 시도해 주세요."
      action={<button className="button" onClick={retry} type="button">다시 시도</button>}
    />
  );
}
