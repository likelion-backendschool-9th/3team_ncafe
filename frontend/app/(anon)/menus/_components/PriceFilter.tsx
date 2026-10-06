import Link from "next/link";

interface PriceFilterProps {
  prices: { value: string; label: string }[];
  currentPrice: string | null;
}

export default function PriceFilter({ prices, currentPrice }: PriceFilterProps) {
  return (
    <section className="m3-card card:outlined card-padding:self">
      <div className="card-header">
        <div className="card-titles">
          <h2 className="card-subhead">가격</h2>
        </div>
      </div>
      <ul className="m3-list list-size:compact">
        {prices.map((p) => {
          const isActive = p.value === currentPrice;
          return (
            <li key={p.value}>
              <Link
                href={`/menus?price=${p.value}`}
                className={`list-item${isActive ? " list-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="list-content">{p.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
