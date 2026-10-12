import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository } from "@/app/_lib/mock/menus";
import styles from "../menus.module.css";

const won = new Intl.NumberFormat("ko-KR");
const temperatureLabel: Record<string, string> = { hot: "핫", ice: "아이스" };

export default async function MenuDetailPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menu = await mockMenuRepository.get(id);
  if (!menu) notFound();

  return (
    <main className={styles.page}>
      <div className="container">
        <nav className={styles.breadcrumb} aria-label="현재 위치">
          <Link href="/menus">전체 메뉴</Link>
          <span aria-hidden="true">/</span>
          <span>{menu.name}</span>
        </nav>

        <div className={styles.detail}>
          <div className={styles.detailImageWrap}>
            <Image
              src={menu.imageUrl || MENU_IMAGE_PLACEHOLDER}
              alt={`${menu.name} 이미지`}
              width={520}
              height={390}
              unoptimized
              className={styles.detailImage}
            />
          </div>

          <div className={styles.detailBody}>
            <div className={styles.detailBadges}>
              {!menu.available && <span className={`${styles.detailBadge} ${styles.detailBadgeSoldOut}`}>품절</span>}
              {menu.available && menu.isNew && <span className={`${styles.detailBadge} ${styles.detailBadgeNew}`}>NEW</span>}
              {menu.available && menu.recommended && <span className={`${styles.detailBadge} ${styles.detailBadgeRecommend}`}>추천</span>}
            </div>

            <div>
              <h1 className={styles.detailName}>{menu.name}</h1>
              <p className={styles.detailNameEn}>{menu.nameEn}</p>
            </div>

            <p className={styles.detailPrice}>{won.format(menu.price)}원</p>
            <p className={styles.detailDescription}>{menu.description}</p>

            <div className={styles.detailMeta}>
              <div className={styles.detailMetaRow}>
                <span className={styles.detailMetaLabel}>카테고리</span>
                <span className={styles.detailMetaValue}>{menu.categories.join(", ") || "미분류"}</span>
              </div>
              {menu.temperatures.length > 0 && (
                <div className={styles.detailMetaRow}>
                  <span className={styles.detailMetaLabel}>온도</span>
                  <span className={styles.detailMetaValue}>
                    {menu.temperatures.map((t) => temperatureLabel[t] ?? t).join(" · ")}
                  </span>
                </div>
              )}
              <div className={styles.detailMetaRow}>
                <span className={styles.detailMetaLabel}>판매 상태</span>
                <span className={styles.detailMetaValue}>{menu.available ? "판매 중" : "품절"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
