import Image from 'next/image';
import Link from 'next/link';
import { MENU_IMAGE_PLACEHOLDER, type Menu } from '@/app/_lib/mock/menus';
import styles from './MenuCard.module.css';

const won = new Intl.NumberFormat('ko-KR');

export function MenuCard({ menu }: { menu: Menu }) {
  return (
    <Link href={`/menus/${menu.id}`} className={styles.card}>
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
          {!menu.available && <span className={`${styles.badge} ${styles.badgeSoldOut}`}>품절</span>}
          {menu.available && menu.recommended && <span className={`${styles.badge} ${styles.badgeRecommend}`}>추천</span>}
          {menu.available && menu.isNew && <span className={`${styles.badge} ${styles.badgeNew}`}>첫 개시</span>}
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
  );
}
