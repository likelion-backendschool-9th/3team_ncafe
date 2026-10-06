import Link from "next/link";
import { Category } from "@/lib/types";

interface CategoryFilterProps {
  currentCategoryId: number | null;
}

export default async function CategoryFilter({ currentCategoryId }: CategoryFilterProps) {
  // 백엔드 API로부터 카테고리 목록 패치
  const res = await fetch("http://localhost:8080/api/categories", {
    cache: "no-store", // 실시간 데이터 반영을 위해 캐시 비활성화 (필요시 next: { revalidate: 3600 } 등으로 변경 가능)
  });
  const categories: Category[] = res.ok ? await res.json() : [];

  const totalCount = categories.reduce((n, c) => n + c.count, 0);

  return (
    <section className="m3-card card:outlined card-padding:self">
      <div className="card-header">
        <div className="card-titles">
          <h2 className="card-subhead">카테고리</h2>
        </div>
      </div>
      <ul className="m3-list list-size:compact">
        {[
          { id: null, name: "전체", count: totalCount },
          ...categories,
        ].map((c) => {
          const isActive = c.id === currentCategoryId;
          return (
            <li key={c.name}>
              <Link
                href={c.id === null ? "/menus" : `/menus?category=${c.id}`}
                className={`list-item ${isActive ? " list-active" : ""}`}
              >
                <span className="list-content">{c.name}</span>
                <span className="list-trailing">{c.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
