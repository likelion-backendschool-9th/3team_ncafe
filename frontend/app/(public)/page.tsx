import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/app/_components/BrandLogo';
import {
  mockMenuRepository,
  MENU_IMAGE_PLACEHOLDER,
  type Menu,
} from '@/app/_lib/mock/menus';
import { getCurrentUser } from '@/app/_lib/session/session';
import styles from './page.module.css';

const won = new Intl.NumberFormat('ko-KR');
// 이미지를 바꿀 때 이 URL에 로컬 경로나 직접 찾은 이미지 URL을 넣으세요.
const HERO_IMAGE_URL = '/images/hero/dabang-interior-music-box-booth.png';

function pickFeatured(menus: Menu[]): Menu[] {
  return menus.filter((menu) => menu.available && menu.recommended).slice(0, 16);
}

export default async function HomePage() {
  const [user, allMenus] = await Promise.all([
    getCurrentUser(),
    mockMenuRepository.list(),
  ]);
  const featuredMenus = pickFeatured(allMenus);

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
              <Link className={styles.ctaSecondary} href="/music-box">
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

      <section className={`container ${styles.usp}`}>
        <div className={styles.uspHeading}>
          <p>삼다방의 약속</p>
          <h2>매일 정성껏 준비합니다</h2>
          <span aria-hidden="true">✦ · ✦ · ✦</span>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🌱
          </span>
          <h3>매일 로스팅</h3>
          <p>매장에서 매일 신선하게 로스팅한 원두만 사용해요.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🛎️
          </span>
          <h3>빠른 픽업</h3>
          <p>미리 담아두고 매장에서 바로 픽업할 수 있어요.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🧾
          </span>
          <h3>간편한 주문</h3>
          <p>메뉴를 눌러서 담고, 몇 번의 클릭으로 주문 끝.</p>
        </div>
        <div className={styles.uspItem}>
          <span className={styles.uspIcon} aria-hidden="true">
            🍵
          </span>
          <h3>정성 가득 보양차</h3>
          <p>
            쌍화차부터 생강차, 율무차까지 — 한의원 저리가라, 매일
            정성껏 달인 보양차로 몸을 다독여요.
          </p>
        </div>
      </section>

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
            {featuredMenus.map((menu, index) => (
              <Link
                key={menu.id}
                href={`/menus/${menu.id}`}
                className={styles.menuCard}
              >
                <div className={styles.menuCardImageWrap}>
                  <Image
                    src={menu.imageUrl || MENU_IMAGE_PLACEHOLDER}
                    alt={`${menu.name} 이미지`}
                    width={240}
                    height={180}
                    unoptimized
                    className={styles.menuCardImage}
                  />
                  {menu.isNew && <span className={styles.badgeNew}>NEW</span>}
                  {menu.recommended && (
                    <span className={styles.badgeRecommend}>추천</span>
                  )}
                  {index === 0 && (
                    <span className={styles.starburst} aria-hidden="true">
                      <span>{won.format(menu.price)}</span>
                      <small>원</small>
                    </span>
                  )}
                </div>
                <div className={styles.menuCardBody}>
                  <p className={styles.menuCardName}>{menu.name}</p>
                  <p className={styles.menuCardNameEn}>{menu.nameEn}</p>
                  {index !== 0 && (
                    <div className={styles.menuCardPriceRow}>
                      <span className={styles.leader} aria-hidden="true" />
                      <span className={styles.menuCardPrice}>
                        {won.format(menu.price)}원
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link className={styles.moreLink} href="/menus">
          전체 메뉴 보러 가기 <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className={`container ${styles.story}`}>
        <span
          className={`${styles.flourish} ${styles.flourishTl}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.flourish} ${styles.flourishTr}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.flourish} ${styles.flourishBl}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.flourish} ${styles.flourishBr}`}
          aria-hidden="true"
        />
        <div className={styles.storyText}>
          <p className={styles.sectionEyebrow}>다방 이야기 · 뮤직박스</p>
          <h2 className={styles.sectionTitle}>당신의 사연을 들려주세요</h2>
          <p>
            좁은 골목 안, 삐걱이는 나무문을 열고 들어서면{' '}
            <strong>삼다방</strong>은 늘 그 자리에 있었습니다. 낡은 전축에서
            흘러나오는 음악과 정성껏 달인 쌍화차 한 잔으로, 단골손님의 하루를
            다독여온 세월이었지요.
            <br />
            이제 뮤직박스에 사연과 신청곡을 남겨 주세요. 당신이 고른 노래를
            다방의 음악으로 틀어드립니다.
          </p>
          <Link className={styles.storyLink} href="/music-box">사연과 신청곡 보내기 →</Link>
        </div>
        <div className={styles.storyArt} aria-hidden="true">
          <span>♪</span>
        </div>
      </section>

      <section className={`container ${styles.info}`} aria-label="매장 안내">
        <div className={styles.infoCard}>
          <span className={styles.infoMark} aria-hidden="true">
            ✦
          </span>
          <h3 className={styles.sectionTitle}>매장 안내</h3>
          <p>서울 어딘가 카페거리 12길 3 · 매일 09:00 – 22:00</p>
          <p>전화 문의 02-1234-5678</p>
        </div>
      </section>
    </main>
  );
}
