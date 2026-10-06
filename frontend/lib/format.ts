// 화면 표기 — 금액·날짜·옵션 요약. 백엔드는 숫자와 ISO 문자열만 준다.
import type { OrderStatus } from "./types";

export const won = (n: number) => n.toLocaleString("ko-KR");

export function dateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const date = (iso: string) => dateTime(iso).slice(0, 10);

/** "HOT · Regular · 2개" — 옵션 없는 메뉴는 "2개" */
export function optionSummary(temperature: string | null, size: string | null, quantity?: number) {
  const parts = [temperature, size].filter(Boolean) as string[];
  if (quantity !== undefined) parts.push(`${quantity}개`);
  return parts.length ? parts.join(" · ") : "옵션 없음";
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  waiting: { label: "대기", color: "neutral" },
  preparing: { label: "제조 중", color: "warning" },
  done: { label: "수령 완료", color: "success" },
  canceled: { label: "취소됨", color: "neutral" },
};

export const MENU_STATUS = {
  on: { label: "판매 중", color: "success" },
  soldout: { label: "품절", color: "warning" },
  hidden: { label: "비공개", color: "neutral" },
} as const;

export const image = (src: string | null, slug: string) => src ?? `/images/menus/${slug}.svg`;
