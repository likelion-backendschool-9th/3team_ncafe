// 통계 카드 — 대시보드·메뉴 목록·메뉴 상세의 "레이블 / 큰 숫자 / 증감" 카드. m3-grid 안 li 로 놓는다.
export type Stat = { label: string; value: string; delta?: string; trend?: "up" | "down" };

const TREND_COLOR = { up: "color:success", down: "color:danger" } as const;

export default function StatCard({ label, value, delta, trend }: Stat) {
  return (
    <li className="m3-card card:outlined card-padding:self">
      <span className="display:block font-size:body-sm color:text-muted">{label}</span>
      <strong className="display:block margin-top:2 font-size:heading-md font-weight:bold letter-spacing:tight">
        {value}
      </strong>
      {delta && (
        <span
          className={`display:block margin-top:2 font-size:caption ${trend ? TREND_COLOR[trend] : "color:text-muted"}`}
        >
          {delta}
        </span>
      )}
    </li>
  );
}
