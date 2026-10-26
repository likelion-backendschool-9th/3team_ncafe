"use client";

import { StatePanel } from "@/app/_components/ui/StatePanel";

export default function UserListError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatePanel
      eyebrow="회원 관리"
      title="회원 정보를 불러오지 못했습니다"
      description="백엔드 서버 연결을 확인한 뒤 다시 시도해 주세요."
      action={<button className="button" onClick={reset} type="button">다시 시도</button>}
    />
  );
}
