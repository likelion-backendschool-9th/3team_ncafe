import Image from "next/image";
import Link from "next/link";
import { mockCategoryRepository } from "@/app/_lib/mock/categories";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository } from "@/app/_lib/mock/menus";
import styles from "./menus.module.css";

const won = new Intl.NumberFormat("ko-KR");

export default async function MenusPage({ searchParams }: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [allMenus, categories] = await Promise.all([
    mockMenuRepository.list(),
    mockCategoryRepository.list(),
  ]);

  const visibleMenus = allMenus.filter(
    (menu) => !category || menu.categories.includes(category),
  );

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
            href="/menus"
            className={`${styles.filterChip} ${!category ? styles.filterChipActive : ""}`}
          >
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/menus?category=${encodeURIComponent(c.name)}`}
              className={`${styles.filterChip} ${category === c.name ? styles.filterChipActive : ""}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {visibleMenus.length === 0 ? (
          <p className={styles.empty}>해당 카테고리에 등록된 메뉴가 없어요.</p>
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
                  {!menu.available && <span className={styles.badgeSoldOut}>품절</span>}
                  {menu.available && menu.isNew && <span className={styles.badgeNew}>NEW</span>}
                  {menu.available && menu.recommended && <span className={styles.badgeRecommend}>추천</span>}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{menu.name}</p>
                  <p className={styles.cardNameEn}>{menu.nameEn}</p>
                  <div className={styles.priceRow}>
                    <span className={styles.leader} aria-hidden="true" />
                    <span className={styles.price}>{won.format(menu.price)}원</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
