"use client";

import Link from "next/link";
import controls from "./_components/order-controls.module.css";

export default function OrdersError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section role="alert">
    <h2>주문 정보를 불러오지 못했습니다</h2>
    <p>서버 연결을 확인하고 다시 시도해 주세요. 변경 요청 중이었다면 현재 주문 상태를 먼저 확인해 주세요.</p>
    <button className={controls.button} type="button" onClick={retry}>다시 시도</button>{" "}
    <Link href="/admin/orders">주문 목록으로</Link>
  </section>;
}
