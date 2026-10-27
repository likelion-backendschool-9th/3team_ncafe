"use client";

import { StatePanel } from "@/app/_components/ui/StatePanel";

export default function CustomerOrdersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatePanel
      eyebrow="MY ORDERS"
      title="주문 내역을 불러오지 못했습니다"
      description="잠시 후 다시 시도해 주세요."
      action={<button type="button" onClick={reset}>다시 시도</button>}
    />
  );
}
