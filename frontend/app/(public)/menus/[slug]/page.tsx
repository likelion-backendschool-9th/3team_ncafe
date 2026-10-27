import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/_lib/session/session";
import { getMenu } from "../../_lib/menus/api";
import { visibleMenuImage } from "../../_lib/menus/image";
import type { MenuResponse } from "../../_lib/menus/types";
import styles from "../menus.module.css";
import { BackButton } from "./_components/BackButton";
import { OrderPanel } from "./_components/OrderPanel";
import type { Temperature } from "./_components/TemperaturePicker";

const won = new Intl.NumberFormat("ko-KR");

type Props = { params: Promise<{ slug: string }> };

function temperaturesOf(menu: MenuResponse): Temperature[] {
  const temperatures: Temperature[] = [];
  if (menu.supportsHot) temperatures.push("hot");
  if (menu.supportsIced) temperatures.push("ice");
  return temperatures;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const menu = await getMenu((await params).slug);
  if (!menu) notFound();
  return { title: `${menu.name} | 삼다방`, description: menu.description };
}

export default async function MenuDetailPage({ params }: Props) {
  const { slug } = await params;
  const [menu, user] = await Promise.all([getMenu(slug), getCurrentUser()]);
  if (!menu) notFound();
  const image = visibleMenuImage(menu.imageUrl);

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.detailTopBar}>
          <BackButton />
          <nav className={styles.breadcrumb} aria-label="현재 위치">
            <Link href="/menus">전체 메뉴</Link>
            <span aria-hidden="true">/</span>
            <span>{menu.name}</span>
          </nav>
        </div>

        <div className={styles.detail}>
          <div className={styles.detailImageWrap}>
            <Image
              src={image.src}
              alt={`${menu.name} 이미지`}
              width={520}
              height={390}
              unoptimized
              data-brighten={image.brighten}
              className={styles.detailImage}
            />
          </div>

          <div className={styles.detailBody}>
            <div className={styles.detailInfo}>
              <div className={styles.detailBadges}>
                {!menu.available && (
                  <span
                    className={`${styles.detailBadge} ${styles.detailBadgeSoldOut}`}
                  >
                    품절
                  </span>
                )}
                {menu.available && menu.recommended && (
                  <span
                    className={`${styles.detailBadge} ${styles.detailBadgeRecommend}`}
                  >
                    추천
                  </span>
                )}
                {menu.available && menu.isNew && (
                  <span
                    className={`${styles.detailBadge} ${styles.detailBadgeNew}`}
                  >
                    첫 개시
                  </span>
                )}
              </div>

              <h1 className={styles.detailName}>{menu.name}</h1>

              <p className={styles.detailPrice}>{won.format(menu.price)}원</p>
              <p className={styles.detailDescription}>{menu.description}</p>
            </div>

            <div className={styles.detailMeta}>
              <div className={styles.detailMetaRow}>
                <span className={styles.detailMetaLabel}>카테고리</span>
                <span className={styles.detailMetaValue}>{menu.categoryName}</span>
              </div>
              <div className={styles.detailMetaRow}>
                <span className={styles.detailMetaLabel}>판매 상태</span>
                <span className={styles.detailMetaValue}>
                  {menu.available ? "판매 중" : "품절"}
                </span>
              </div>
            </div>
            <OrderPanel
              menuId={menu.id}
              menuSlug={menu.slug}
              price={menu.price}
              temperatures={temperaturesOf(menu)}
              temperatureLabel={
                menu.categoryName === "세트" ? "음료 온도" : "온도"
              }
              available={menu.available}
              isLoggedIn={user !== null}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
