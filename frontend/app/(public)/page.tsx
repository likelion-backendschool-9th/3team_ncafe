import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/app/_components/BrandLogo';
import { getCurrentUser } from '@/app/_lib/session/session';
import { MenuCard } from './_components/MenuCard';
import { getRecommendedMenus } from './_lib/menus/api';
import { MusicBoxHighlight } from './musicbox/_components/MusicBoxHighlight';
import styles from './page.module.css';

// 이미지를 바꿀 때 이 URL에 로컬 경로나 직접 찾은 이미지 URL을 넣으세요.
const HERO_IMAGE_URL = '/images/hero/dabang-interior-music-box-booth.png';

export default async function HomePage() {
  // 판매 중·추천 메뉴 최신순 16개는 백엔드가 고른다.
  const [user, featuredMenus] = await Promise.all([
    getCurrentUser(),
    getRecommendedMenus(),
  ]);

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroArt}>
          <Image
            src={HERO_IMAGE_URL}
            alt="붉은 소파와 청록색 바둑판 바닥을 사이에 두고 독립된 뮤직 박스 부스가 있는 옛 다방 내부"
            fill
            unoptimized
            className={styles.heroPhoto}
            priority
          />
        </div>
        <span className={`${styles.flourish} ${styles.flourishTl}`} aria-hidden="true" />
        <span className={`${styles.flourish} ${styles.flourishTr}`} aria-hidden="true" />
        <span className={`${styles.flourish} ${styles.flourishBl}`} aria-hidden="true" />
        <span className={`${styles.flourish} ${styles.flourishBr}`} aria-hidden="true" />
        <span className={styles.heroStamp} aria-hidden="true">
          <BrandLogo compact />
        </span>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>· 그 시절 다방, 오늘의 삼다방 ·</p>
            <h1 className={styles.title}>
              문을 열면,
              <br />
              그 시절의 온기
            </h1>
            <span className={styles.divider} aria-hidden="true" />
            <p className={styles.tagline}>
              오래된 다방의 편안함을 한 잔에 담았습니다.
              <br />커피와 차, 달콤한 메뉴를 천천히 둘러보세요.
            </p>
            {user && (
              <p className={styles.welcome}>{user.name}님, 오늘도 반가워요.</p>
            )}
            <div className={styles.ctaRow}>
              <Link className={styles.ctaPrimary} href="/menus">
                전체 메뉴 보기
              </Link>
              <Link className={styles.ctaSecondary} href="/musicbox">
                뮤직박스 신청곡
              </Link>
              {!user && (
                <Link className={styles.ctaSecondary} href="/login">
                  로그인
                </Link>
              )}
            </div>
            <span className={styles.status}>
              <span className={styles.statusDot} aria-hidden="true" />
              삼다방 · 오래 머물고 싶은 한 잔
            </span>
          </div>
        </div>
      </section>

      <div className={styles.perforation} aria-hidden="true">
        {Array.from({ length: 28 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <section
        className={`container ${styles.featured}`}
        aria-labelledby="featured-heading"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>오늘의 메뉴판</p>
          <h2 id="featured-heading" className={styles.sectionTitle}>
            추천 메뉴
          </h2>
        </div>
        {featuredMenus.length === 0 ? (
          <p className={styles.empty}>
            추천 메뉴가 아직 없어요. 전체 메뉴에서 다른 메뉴를 둘러보세요.
          </p>
        ) : (
          <div className={styles.featuredGrid}>
            {featuredMenus.map((menu) => (
              <MenuCard key={menu.id} menu={menu} />
            ))}
          </div>
        )}
        <Link className={styles.moreLink} href="/menus">
          전체 메뉴 보러 가기 <span aria-hidden="true">→</span>
        </Link>
      </section>

      <MusicBoxHighlight />

      <section className={`container ${styles.usp}`}>
        <div className={styles.uspHeading}>
          <p>삼다방의 약속</p>
          <h2>매일 정성껏 준비합니다</h2>
          <span aria-hidden="true">✦ · ✦ · ✦</span>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            ☕
          </span>
          <h3>둘둘둘 다방 커피</h3>
          <p>커피 둘, 설탕 둘, 프림 둘. 주인장이 그 시절 황금 비율 그대로 달달하게 타 드려요.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🛎️
          </span>
          <h3>기다림 없는 픽업</h3>
          <p>미리 주문해 두시면 카운터에서 따끈하게 내어 드려요. 바쁜 날에도 한 잔은 챙기셔야지요.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            📻
          </span>
          <h3>사연 실은 신청곡</h3>
          <p>듣고 싶은 노래에 사연 한 줄 적어 보내시면, 뮤직박스 DJ가 차례대로 틀어 드려요.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🍵
          </span>
          <h3>주인장표 보양차</h3>
          <p>노른자 동동 띄운 쌍화차에 생강차, 율무차까지. 매일 정성껏 달여 몸을 따뜻하게 다독여요.</p>
        </div>
      </section>
    </main>
  );
}
