# NCafe 프론트 (목업 본)

Next.js 16(App Router) · TypeScript · newtil. 이 브랜치(`newtil`)는 백엔드를 부르지 않고 **목업 데이터**로 화면을 그린다. API 로 연결한 본은 `api` 브랜치.

```bash
npm install
npm run dev     # http://localhost:3000
```

## 목업 데이터 — [lib/mock.ts](lib/mock.ts)

- **모양은 백엔드 DTO 와 같다** — [lib/types.ts](lib/types.ts)(`MenuSummary`·`MenuDetail`·`Category`·`Favorite`·`Basket`·`Order`·`Dashboard`·`AdminMenuDetail`)가 정본이고, 백엔드(`../backend`)의 `dto/` 와 1:1.
- **값은 백엔드의 `db/seed.sql` 과 같다** — 메뉴 12개(id 20~31, 레몬에이드 비공개·크루아상 품절·스무디 둘 신메뉴), 카테고리 개수 5/2/2/2, 홍길동의 좋아요 4·장바구니 3·주문 5, 대시보드 집계.
- 페이지는 `import { MENUS } from "@/lib/mock"` 처럼 읽어 그리기만 한다. API 로 바꿀 때는 그 자리를 `fetch` 결과로 갈아 끼우면 된다(`api` 브랜치가 그 결과).
- 금액·날짜·상태 표기는 [lib/format.ts](lib/format.ts)(`won`, `dateTime`, `ORDER_STATUS`, `MENU_STATUS`, `image`).

| 화면 | 쓰는 상수 | 해당 API |
|---|---|---|
| `/` | `CATEGORIES`, `MENUS` | GET /api/categories, /api/menus |
| `/menus` | `CATEGORIES`, `MENUS` | GET /api/menus?category&price&sort&page |
| `/menus/[slug]` | `MENU_DETAIL`(카페라떼) | GET /api/menus/{slug} |
| `/my/orders` `favorites` `basket` | `ORDERS`, `FAVORITES`, `BASKET`, `USER` | GET /api/my/… |
| `/admin` | `DASHBOARD` | GET /api/admin/dashboard |
| `/admin/menus/list` | `ADMIN_MENUS` | GET /api/admin/menus |
| `/admin/menus/[id]`, `edit` | `ADMIN_MENU_DETAIL`(카페라떼) | GET /api/admin/menus/{id} |

동적 라우트(`[slug]`, `[id]`)는 어떤 값으로 와도 카페라떼를 보여준다(목업).

## 구조

```
app/
  layout.tsx · globals.css       폰트·전역 CSS(design-tokens → materials → themes/ncafe → @newtil/css)
  (anon)/                         공개 — m3-site (홈 · 메뉴 목록 · 상세 · 로그인 · 회원가입 · 비밀번호 찾기 · 소개)
  my/                             회원 — 주문 내역 · 좋아요 · 장바구니
  admin/                          관리자 — m3-layout (대시보드 · 메뉴 목록/등록/상세/수정)
  _components/, */_components/    쓰는 곳 가까이 둔 컴포넌트(파스칼 파일 하나)
lib/                              types · mock · format
```

스타일은 newtil 만 쓴다 — 페이지 CSS 0줄. 방(m3-site · m3-layout) → 가구(m3-grid · m3-card · m3-form …) → 물품(버튼·필드) → 유틸리티 마감, 토큰 밖의 값만 `속성:ex` + `--속성-ex`.
