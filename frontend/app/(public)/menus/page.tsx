import Image from "next/image";
import Link from "next/link";
import { mockCategoryRepository } from "@/app/_lib/mock/categories";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository, type Menu } from "@/app/_lib/mock/menus";
import styles from "./menus.module.css";

const won = new Intl.NumberFormat("ko-KR");
type MenuSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  sort?: string | string[];
}>;

const sortOptions = ["newest", "name", "price-low", "price-high"] as const;
type SortOption = typeof sortOptions[number];

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function sortMenus(menus: Menu[], sort: SortOption): Menu[] {
  return [...menus].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id);
    if (sort === "price-low") return a.price - b.price || a.name.localeCompare(b.name, "ko");
    if (sort === "price-high") return b.price - a.price || a.name.localeCompare(b.name, "ko");
    return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name, "ko");
  });
}

export default async function MenusPage({ searchParams }: { searchParams: MenuSearchParams }) {
  const { q, category, sort } = await searchParams;
  const [allMenus, categories] = await Promise.all([
    mockMenuRepository.list(),
    mockCategoryRepository.list(),
  ]);
  const query = single(q).trim().slice(0, 100);
  const selectedCategory = categories.some((item) => item.name === single(category)) ? single(category) : "";
  const requestedSort = single(sort);
  const selectedSort: SortOption = sortOptions.includes(requestedSort as SortOption)
    ? requestedSort as SortOption
    : "newest";
  const needle = query.toLocaleLowerCase("ko");
  const visibleMenus = sortMenus(allMenus.filter((menu) => {
    const matchesQuery = !needle || menu.name.toLocaleLowerCase("ko").includes(needle)
      || menu.nameEn.toLocaleLowerCase("en").includes(needle);
    return matchesQuery && (!selectedCategory || menu.categories.includes(selectedCategory));
  }), selectedSort);

  function categoryHref(name: string): string {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (name) params.set("category", name);
    if (selectedSort !== "newest") params.set("sort", selectedSort);
    return params.size ? `/menus?${params.toString()}` : "/menus";
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <p className={styles.eyebrow}>삼다방 메뉴판</p>
          <h1 className={styles.title}>전체 메뉴</h1>
          <p className={styles.subtitle}>정성껏 준비한 메뉴를 한눈에 둘러보세요.</p>
        </div>

        <nav className={styles.filterRow} aria-label="카테고리 필터">
          <Link
            href={categoryHref("")}
            className={`${styles.filterChip} ${!selectedCategory ? styles.filterChipActive : ""}`}
            aria-current={!selectedCategory ? "page" : undefined}
          >
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.name)}
              className={`${styles.filterChip} ${selectedCategory === c.name ? styles.filterChipActive : ""}`}
              aria-current={selectedCategory === c.name ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <form className={styles.searchForm} method="get" role="search">
          {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
          <label className={styles.searchField} htmlFor="customer-menu-query">
            메뉴 검색
            <input id="customer-menu-query" name="q" type="search" maxLength={100} defaultValue={query} placeholder="한글 또는 영어 메뉴명" />
          </label>
          <label className={styles.sortField} htmlFor="customer-menu-sort">
            정렬
            <select id="customer-menu-sort" name="sort" defaultValue={selectedSort}>
              <option value="newest">최근 등록순</option>
              <option value="name">메뉴명순</option>
              <option value="price-low">가격 낮은순</option>
              <option value="price-high">가격 높은순</option>
            </select>
          </label>
          <button className="button" type="submit">검색</button>
        </form>

        <div className={styles.resultRow}>
          <p>메뉴 <strong>{visibleMenus.length}</strong>개</p>
          {(query || selectedCategory || selectedSort !== "newest") && <Link href="/menus">전체 메뉴 보기</Link>}
        </div>

        {visibleMenus.length === 0 ? (
          <div className={styles.empty} role="status">
            <p>{allMenus.length === 0 ? "등록된 메뉴가 아직 없어요." : "조건에 맞는 메뉴가 없어요."}</p>
            {allMenus.length > 0 && <Link href="/menus">검색 조건 초기화</Link>}
          </div>
        ) : (
          <div className={styles.grid}>
            {visibleMenus.map((menu) => (
              <Link key={menu.id} href={`/menus/${menu.id}`} className={styles.card}>
                <div className={styles.cardImageWrap}>
                  <Image
                    src={menu.imageUrl || MENU_IMAGE_PLACEHOLDER}
                    alt={`${menu.name} 이미지`}
                    width={240}
                    height={180}
                    unoptimized
                    data-unavailable={!menu.available}
                    className={styles.cardImage}
                  />
                  <div className={styles.badges}>
                    {!menu.available && <span className={styles.badgeSoldOut}>품절</span>}
                    {menu.available && menu.isNew && <span className={styles.badgeNew}>NEW</span>}
                    {menu.available && menu.recommended && <span className={styles.badgeRecommend}>추천</span>}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{menu.name}</p>
                  <p className={styles.price}>
                    <span className={styles.wonSign}>₩</span>
                    {won.format(menu.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
