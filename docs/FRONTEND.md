# 삼다방 프론트엔드 개발 문서

> 작성일 2026-10-22. 프론트엔드 작업의 기준 문서다. 라우트·매핑·진행 현황은 2026-10-22 코드 검증 결과(프론트 `develop` e1e935c, 백엔드 `origin/develop` 2e6ddf1)를 따른다.
>
> - **데이터·API:** [백엔드 청사진](../backend/docs/2026-10-20-backend-blueprint.md)과 백엔드 DTO 코드가 기준
> - **용어:** [GLOSSARY.md](../GLOSSARY.md)가 기준
> - **기능 범위·흐름 원문:** [frontend-청사진.md](./frontend-청사진.md). URL·체크리스트는 검증 전 상태이므로 이 문서와 다르면 이 문서를 따른다.
> - **개발 규칙:** FRONTEND_GUIDE.md를 5장으로 통합했고 원본은 삭제했다.

## 1. 개요

삼다방은 고객이 메뉴를 탐색하고 장바구니에 담아 주문하며, 뮤직박스에 사연과 신청곡을 남기는 다방 서비스다. 관리자는 회원·카테고리·메뉴·주문과 뮤직박스 선곡을 관리한다. Next.js App Router 16.3.5, React 19, TypeScript `strict`를 쓴다.

WBS 번호는 최신 WBS(백엔드 청사진)를 따르고, 괄호 안은 청사진의 번호다.

| 역할 | 기능 | WBS | 현재 상태 |
| --- | --- | --- | --- |
| 비회원/회원 | 가입·로그인·로그아웃, 내 정보 조회·수정 | 1.1~1.5 | 수정만 미구현 |
| 관리자 | 회원 목록·상세·상태 변경, 관리자 생성 | 2.x | 관리자 생성 미구현 |
| 관리자 | 카테고리 관리 | 13.x | 구현. 백엔드 API 있음 |
| 관리자 | 메뉴 CRUD | 3.x | 구현. 백엔드 API 있음 |
| 고객 | 메뉴 목록·상세 | 4.x | 구현 |
| 고객 | 장바구니 | 14.1~14.4 (15.0) | 구현. 백엔드 API 연결 |
| 고객 | 주문 등록·목록·상세 | 6.1, 6.3~6.4 | 구현. 고객 취소(6.2)는 제공하지 않는다(2026-10-27 확정) |
| 고객 | 결제·결제수단 CRUD | 7.x, 8.x | **보류(Q1).** 카운터 결제수단 선택만 있음 |
| 관리자 | 주문 목록·상세·상태 변경·취소 | 5.x/12.x | 구현 |
| 방문자/고객 | 뮤직박스 신청·대기·현재 곡 | 11.x | 구현. 신청은 회원만 |
| 관리자 | 신청곡 확인, YouTube 연결, 선곡·재생 | 10.x | 구현 |
| 관리자/고객 | 리뷰 | (13.x, 14.x) | **범위 밖**, 미구현 |

**현재 데이터·인증 상태**
- 2026-10-25 인증 6단계에서 가입·로그인·로그아웃·본인 조회를 실제 `/api/v1` 세션 API에 연결했다. `getCurrentUser`·`requireRole`은 백엔드 본인 응답을 사용하며 목 인증 쿠키는 사용하지 않는다.
- 나머지 업무 화면은 목 저장소([app/_lib/mock/](../frontend/app/_lib/mock/), `.data/*.json`, 운영 환경에서는 차단)를 유지한다. 업무 데이터의 API 전환은 쌍 단위 후속 작업이다.
- 장바구니는 백엔드 장바구니 API(회원별 서버 저장)를 쓴다. 주문 대상 체크만 `/cart` 화면 상태로 두고 `/checkout?cartItemIds=`로 넘긴다.

## 2. 라우트-컨트롤러 매핑

### 2-1. 원칙

1. **작업 단위는 "페이지 ↔ 주 컨트롤러" 쌍이다.** 작업 분배, PR, 리뷰를 이 쌍 단위로 한다.
2. **주 컨트롤러**는 그 페이지의 첫 화면 조회와 핵심 변경을 맡는 컨트롤러다. 페이지 하나에 정확히 하나다(근거: 백엔드 청사진의 페이지 표).
3. **공유는 허용한다.** 한 컨트롤러가 여러 페이지의 주 컨트롤러인 경우(N:1)다. 공유 컨트롤러의 엔드포인트를 바꾸면 그 컨트롤러를 쓰는 모든 페이지 담당자가 리뷰한다.
4. **예외는 2-3 목록에 있는 것만 인정한다.** 예외는 두 종류다.
   - 보조 컨트롤러: 페이지 안의 부수 동작이 다른 시스템의 API를 부르는 경우
   - 주 컨트롤러 없음
5. **URL을 추가·변경·삭제하면 대응 컨트롤러와 함께 바꾼다.** 프론트 단독으로 바꾸지 않는다. 새 예외나 새 엔드포인트는 백엔드와 합의해 백엔드 청사진에 먼저 반영한다.

### 2-2. 매핑표

**굵게** 표시한 컨트롤러만 백엔드 코드에 있다. 나머지 엔드포인트는 백엔드 청사진의 계약 초안이다. 모든 페이지가 프론트에는 목 저장소로 구현돼 있다.

| 페이지 URL | 주 컨트롤러 | 엔드포인트 (`/api/v1` 생략) | WBS | 비고 |
| --- | --- | --- | --- | --- |
| `/` | **`HomeController`** | `GET /index/menus`, `GET /index/songs` | 인덱스 | 보조 |
| `/login`, `/signup` | **`AuthController`** | `POST /auth/login`, `POST /auth/signup` | 1.1, 1.3 | 공유 |
| `/menus` | `MenusController`(공개) | `GET /menus`(`q`,`categoryId`,`status`,`sort`,`page`,`size`), `GET /menus/categories` | 4.1 | 공유 |
| `/menus/[slug]` | `MenusController`(공개) | `GET /menus/{slug}` | 4.2 | 공유, 보조 |
| `/musicbox` | **`SongsController`**(공개) | `GET /musicbox/songs`, `GET /musicbox/songs/now`, `POST /musicbox/songs` | 11.1~11.3 | 신청은 고객 회원만 |
| `/cart` | `my/CartItemsController` | `GET /cart/items`, `PUT`·`DELETE /cart/items/{id}` | 14.2~14.4 | |
| `/checkout` | `my/OrdersController` | `POST /orders` | 6.1 | 공유 |
| `/my` | **`my/UsersController`** | `GET /my` | 1.5 | 보조 |
| `/my/orders`, `/my/orders/[id]` | `my/OrdersController` | `GET /orders`, `GET /orders/{id}` | 6.3~6.4 | 공유. 고객 취소는 제공하지 않는다(2026-10-27 확정) |
| `/my/songs` | **`my/SongsController`** | `GET /my/songs`, `DELETE /my/songs/{id}` | 11.4~11.5 | 보조 |
| `/admin` | 없음 | 관리자 Menus·Orders·Songs 목록 조합. 메뉴 현황은 `GET /admin/menus/summary` | — | 예외 |
| `/admin/users`, `/admin/users/[id]` | `admin/UsersController` | `GET /admin/users`, `GET`·`PUT /admin/users/{id}` | 2.1~2.3 | 공유 |
| `/admin/categories` | **`admin/CategoriesController`** | `GET`·`POST /admin/categories`, `PUT`·`DELETE /admin/categories/{id}`, `PUT /admin/categories/order` | 13.x | |
| `/admin/menus`, `/new`, `/[id]`, `/[id]/edit` | **`admin/MenusController`** | `GET /admin/menus`(`q`,`categoryId`,`status`,`sort`,`page`,`size`), `POST`, `GET`·`PUT`·`DELETE /admin/menus/{id}` | 3.1~3.5 | 공유(4개 화면) |
| `/admin/orders`, `/admin/orders/[id]` | **`admin/OrdersController`** | `GET /admin/orders`(`q`,`status`,`group`,`sort`,`page`,`size`), `GET /admin/orders/{id}`, `PUT /admin/orders/status`(접수 취소 포함) | 5.x/12.x | 공유 |
| `/admin/songs` | **`admin/SongsController`** | 선곡 API 8종(백엔드 청사진 `admin/SongsController` 행) | 10.x | |
| `/forbidden` | 없음 | — | — | 예외(프론트 전용) |

**계획됐거나 청사진에만 있는 페이지 (모두 프론트 미구현)**

| 페이지 URL | 주 컨트롤러 | 상태 |
| --- | --- | --- |
| `/profile/update` (청사진 원안 `/profile/edit`) | `my/UsersController` `PUT /users/{id}` | 백엔드 계획(1.4) |
| `/admin/users/new` | `admin/UsersController` `POST /admin/users` | 백엔드 계획(DB 설계 확장) |
| `/checkout/complete` | 없음 | 청사진 제안. 현재는 `/my/orders/[id]?placed=1`로 대체 |
| `/profile/payments*` | 없음 | 보류(Q1) |
| `/orders/[id]/review`, `/profile/reviews*`, `/admin/reviews*` | 없음 | 범위 밖 |

- **청사진 URL과의 대응:** `/menus/[id]`→`/menus/[slug]`, `/orders*`→`/my/orders*`, `/music-box`→`/musicbox`, `/profile`→`/my`, `/admin/music-box`→`/admin/songs`. 청사진에 없던 추가 페이지는 `/my/songs`, `/admin/categories`, `/forbidden`이다.
- **페이지가 아닌 라우트 핸들러:**
  - `/api/story-speech`: 외부 Typecast TTS 호출, 백엔드와 무관

### 2-3. 예외 목록

| 종류 | 페이지 | 컨트롤러·엔드포인트 | 근거 |
| --- | --- | --- | --- |
| 보조 | `/menus/[slug]` | `my/CartItemsController` `POST /menus/{id}/cart/items` | 백엔드 청사진: 담기 동작 |
| 보조 | `/` | `SongsController`(공개) `GET /musicbox/songs/now` | 공용 `MusicBoxRefresher`의 `revision` 폴링. 첫 화면 데이터는 `GET /index/songs`로 받는다(2026-10-27) |
| 보조 | `/my/songs` | `SongsController`(공개) `GET /musicbox/songs/now`, `GET /musicbox/songs` | 현재 곡 부스, 재생 대기 순번, `revision`(2026-10-27) |
| 보조 | `/my` | `AuthController` `POST /auth/logout` | 백엔드 청사진: 로그아웃 |
| 보조 | `/checkout` | `my/CartItemsController` `GET /cart/items` | 주문 대상 항목 조회. `/cart`가 넘긴 `?cartItemIds=`의 줄만 고른다(2026-10-26 결정, 새 엔드포인트 없음) |
| 없음 | `/admin` | 관리자 목록 API 조합 | 백엔드 청사진: 대시보드 API 없음. 메뉴 현황만 `admin/MenusController` `GET /admin/menus/summary`(2026-10-27) |
| 없음 | `/forbidden`, 결제·리뷰·주문 완료 화면 | — | 프론트 전용, 또는 보류·범위 밖 |

다음 한 곳은 코드상 다른 컨트롤러가 필요하지만 근거가 없어 예외로 인정하지 않는다. 6-2에서 정한다.
- 관리자 메뉴 화면의 카테고리 목록

## 3. 라우트별 명세

화면 설명은 코드와 청사진을 참고한다. 이 표는 규칙 적용에 필요한 사실만 담는다.
- flash: 변경 결과를 알리는 일회성 쿼리
- noindex: 고객·관리자 영역 전체와 `/login`, `/signup`, `/forbidden`
- 색인 대상: `/`, `/menus`, `/menus/[slug]`, `/musicbox`

| 페이지 | URL 상태 (기본값은 URL에서 생략) | 클라이언트 컴포넌트 | title · canonical |
| --- | --- | --- | --- |
| `/` | 없음 | `DjBooth`, `MusicBoxRefresher` | 기본값 · `/` |
| `/login` | `next`(안전한 상대 경로), `registered=1`(가입 후 로그인 안내) | `LoginForm` | 로그인 · noindex |
| `/signup` | `next`, 필드 오류·이름/이메일은 action state | `SignupForm` | 회원가입 · noindex |
| `/menus` | `q`(100자), `categoryId`, `sort`=`newest`\|`name`\|`price-low`\|`price-high`. GET 폼 제출, 탭은 Link | 없음 | 메뉴 · `/menus` |
| `/menus/[slug]` | params `slug` | `OrderPanel`(온도·수량), `CartAddedDialog`, `LoginRequiredDialog`, `BackButton` | 메뉴명 · `/menus/{slug}`, 없으면 `notFound()` |
| `/musicbox` | `page`(1부터, 10개), flash `submitted` | `RequestForm`, `DjBooth`, `YouTubePlayer`, `VolumeControl`, `MusicBoxRefresher` | 뮤직박스 · `/musicbox`(page 유지) |
| `/cart` | 없음. 주문하기는 `/checkout?cartItemIds=…` | `CartView`(선택 상태), `CartToolbar`, `CartItemRow`, `CartQuantityControl`, `RemoveCartItemButton`, `CartSummary` | 장바구니 |
| `/checkout` | `cartItemIds`(쉼표로 구분한 장바구니 줄 id, `/cart`가 넘김). 성공하면 `/my/orders/[id]?placed=1`로 replace | `CheckoutView`(화면 전체) | 주문서 |
| `/my` | 없음 | 없음 | 마이페이지 |
| `/my/orders` | 없음 | 없음 | 내 주문 |
| `/my/orders/[id]` | params `id`, flash `placed`·`canceled`·`error` | `CancelOrderForm` | 주문 {코드}, 본인 주문이 아니면 `notFound()` |
| `/my/songs` | flash `deleted`·`error` | `DeleteRequestForm` | 내 신청곡 |
| `/admin` | 없음 | 없음 | 관리자 |
| `/admin/users` | `q`, `status`, `role`, `sort`=`name`\|`email`, `page`. GET 폼 | `UserFilters`(`key={query}`), `UserStatusForm` | 회원 관리 |
| `/admin/users/[id]` | params `id`, 목록 쿼리 유지 | `UserStatusForm` | 회원 상세 |
| `/admin/categories` | 없음 | `CategoryList`, `CategoryRow`, `CreateCategoryForm`, `DeleteCategoryDialog` | 카테고리 관리 |
| `/admin/menus` | `q`(메뉴명·slug), `categoryId`, `status`, `sort`=`newest`\|`oldest`\|`name`\|`price-low`\|`price-high`, `page`(1부터, 20개), flash `created`·`deleted`·`missing` | `MenuFilterSelect`, `MenuPagination`, `DeleteMenuButton` | 메뉴 관리 |
| `/admin/menus/new`, `/[id]/edit` | params `id`(수정) | `MenuForm` | 메뉴 등록 · 메뉴 수정 |
| `/admin/menus/[id]` | params `id`, flash `updated`·`deleteError` | `DeleteMenuButton` | 메뉴명 |
| `/admin/orders` | `q`, `status`, `sort`=`newest`\|`oldest`, `view`=`list`\|`grid`, `activePage`·`completedPage`·`canceledPage`, flash | `OrderSectionAccordion`, `StatusChangeForm`, `ConfirmCancelDialog` | 주문 관리 |
| `/admin/orders/[id]` | params `id`, 목록 쿼리 유지, flash | `StatusChangeForm`, `ConfirmCancelDialog` | 주문 {숫자 ID} |
| `/admin/songs` | 없음 | `RequestCard`, `AddToPlaylistForm`, `YouTubePreview`, `OnAirPlayer`, `CancelRequestForm` | 뮤직박스 운영 |
| `/forbidden` | 없음 | 없음 | 접근 제한 |

## 4. 사용자 흐름

청사진 원문 흐름은 [frontend-청사진.md 3장](./frontend-청사진.md#3-주요-사용자-흐름)에 있다. 현재 코드의 흐름은 다음과 같다.

- **주문:** `/menus` → `/menus/[slug]`(온도·수량, 담으려면 로그인) → `/cart`(주문 대상 항목 체크) → `/checkout`(수령 방식·요청사항·카운터 결제수단·동의) → `/my/orders/[id]`. 실제 결제는 없고 카운터에서 결제한다.
- **주문 처리:** 관리자는 인접 상태로만 옮긴다: `received ↔ preparing ↔ ready ↔ completed`. 관리자 취소는 `received → canceled`만 가능하며 취소 사유(필수·최대 200자)를 입력한다. 회원은 본인 주문 목록·상세에서 저장된 사유를 조회한다. 서버의 `allowedStatuses`·`statusVersion`으로 처리한다. 고객 취소는 제공하지 않는다(2026-10-27 확정).
- **뮤직박스:** 회원 신청(`pending`) → 관리자가 YouTube 링크를 붙여 재생 목록에 담음(`queued`) → 지금 재생(`playing`) → `played`. 접수 취소는 `cancelled`다. 서버의 시작 시각과 영상 길이로 모든 화면의 재생 위치를 맞춘다.

## 5. 개발 규칙

### 5-1. 폴더와 코로케이션

```text
frontend/app/
├─ layout.tsx, error.tsx, loading.tsx, not-found.tsx, forbidden/, robots.ts·sitemap.ts(예정)
├─ _components/        모든 역할이 공유하는 UI
│  └─ ui/              도메인을 모르는 공통 UI (StatePanel, EmptyState)
├─ _lib/               공통 코드: api/(백엔드 요청기, 예정), session/, mock/(전환 후 삭제), <도메인>/types.ts
├─ api/                Next 라우트 핸들러 (/api/v1 아님)
├─ (public)/           인덱스, login, signup, menus, musicbox
├─ (customer)/         cart, checkout, my(orders, songs)
└─ admin/              users, categories, menus, orders, songs
   └─ <route>/         page.tsx, loading.tsx, error.tsx, _components/, _hooks/, _lib/(api.ts, searchParams.ts), _actions.ts
```

- **배치 단계:** 한 화면 → `page.tsx` 옆, 같은 기능 여러 화면 → 기능 폴더, 같은 역할 여러 기능 → `(역할)/_components`, 모든 역할 → `app/_components`·`app/_lib`.
- **위로 올리는 시점:** 처음에는 라우트 안에 만든다. 두 번째 사용처가 생기면 가장 가까운 공통 부모로 올린다.
- 다른 라우트의 `_components`·`_lib`는 import하지 않는다.
- 최상위 `components/`, `lib/`, `stores/`, `types/`, `features/` 폴더는 만들지 않는다.
- `page.tsx`는 조립만 한다. 조회는 `_lib/api.ts`, 변경은 `_actions.ts`(여러 파일이면 `_actions/`)에 둔다.
- 라우트별로 `loading.tsx`·`error.tsx`를 두고, 테스트는 대상 옆에, 시나리오 테스트는 `frontend/e2e/`에 둔다.

### 5-2. 상태 관리

| 상태 | 위치 |
| --- | --- |
| 공유·북마크·뒤로 가기가 의미 있는 값(필터, 정렬, 페이지, 탭, 검색어, id·slug) | URL. page에서 파싱해 props로 내려준다 |
| 서버 데이터(장바구니 포함) | 서버 컴포넌트에서 조회 |
| 일시적 UI 상태(입력 중인 값, 대화상자, 온도·수량, 주문 대상 체크) | 클라이언트 `useState` |
| 여러 클라이언트 컴포넌트가 공유하는 UI 상태 | 가까운 부모의 React Context(최소화) |

- TanStack Query와 Zustand는 쓰지 않는다. 서버 데이터를 클라이언트 전역 상태로 복사하지 않는다.
- 장바구니 `CartContext` + localStorage는 장바구니 API를 연결하면서 걷어냈다(2026-10-26).
- URL 값을 `useState`로 중복해 들고 있지 않는다. 단, 입력 중인 값은 로컬 상태로 두고 제출할 때 URL에 반영한다. 이때 `key`로 URL 값과 다시 맞춘다.
- **URL 파라미터:**
  - 파싱·기본값·검증을 거친 뒤 쓴다. 기본값은 URL에서 생략한다.
  - 이름은 API 쿼리와 맞춘다.
  - URL `page`는 1부터 세고, 0부터 세는 API에는 `page-1`로 넘긴다. 필터를 바꾸면 `page`를 제거한다.
- **검색·필터는 제출할 때 한꺼번에 적용한다.** 기본은 서버 컴포넌트의 `<form method="get">`이다. 클라이언트에서 URL을 바꿔야 하면 `router.replace`를 쓴다. 페이지 이동 성격(페이지네이션·탭·상세)은 `Link`를 쓴다.
- `useSearchParams`를 쓰는 클라이언트 컴포넌트는 `<Suspense>`로 감싼다. props drilling이 3단계를 넘으면 구조를 다시 본다.

```ts
// app/(public)/menus/_lib/searchParams.ts — page.tsx에서 parseMenuSearchParams(await searchParams)로 쓴다
export const MENU_SORTS = ["newest", "name", "price-low", "price-high"] as const;
export type MenuSort = (typeof MENU_SORTS)[number];
export type MenuQuery = { q: string; category: string; sort: MenuSort };
type Raw = Record<string, string | string[] | undefined>;

const single = (value: Raw[string]) => (typeof value === "string" ? value : "");
const isMenuSort = (value: string): value is MenuSort => (MENU_SORTS as readonly string[]).includes(value);

export function parseMenuSearchParams(raw: Raw): MenuQuery {
  const sort = single(raw.sort);
  return { q: single(raw.q).trim().slice(0, 100), category: single(raw.category), sort: isMenuSort(sort) ? sort : "newest" };
}
```

### 5-3. 컴포넌트

- **분리 기준:**
  - 서버/클라이언트 경계(최우선), 독립된 책임(`section`·`article` 단위), 반복 단위, 긴 분기 블록
  - 파일이 200줄을 넘으면 분리를 검토한다
  - 래퍼 컴포넌트나 "나중을 위한" 추상화는 만들지 않는다
- **공통 UI(`app/_components/ui/`):**
  - props만 안다. API·도메인 타입·URL에 의존하지 않는다.
  - 접근성을 내장하고, 네이티브 속성을 `...rest`로 전달한다.
- **`"use client"` 위치:**
  - 상태·이벤트·브라우저 API가 필요한 leaf에만 붙인다. page·layout에는 붙이지 않는다(`error.tsx` 제외).
  - 서버 컴포넌트는 children으로 넘긴다.
  - `window`·`localStorage`는 `useEffect` 안에서만 쓴다. 서버 전용 파일에는 `import "server-only"`를 넣는다.
- **로직 분리:** 긴 상태 로직은 `_hooks/use*.ts`, 순수 함수는 `_lib/`에 둔다.
- **네이밍:**
  - 파일명 = 컴포넌트명(PascalCase), 훅은 `use` camelCase
  - named export. Next 규약 파일만 default export
  - props 타입은 `Props`, 이벤트 props는 `onXxx`, 핸들러는 `handleXxx`
  - 배럴 `index.ts` 금지

### 5-4. 마크업과 접근성

- **랜드마크:**
  - 루트 layout에 본문 바로가기(`<a href="#main-content">`)를 둔다.
  - `<main id="main-content" tabIndex={-1}>`는 **라우트 그룹 layout에 하나만** 둔다. 그룹 layout이 없는 `forbidden/`과 루트 특수 파일은 직접 둔다.
  - `nav`가 여럿이면 `aria-label`로 구분한다. 검색 폼은 `<search>` 또는 `role="search"`를 쓴다.
- **헤딩:** 페이지마다 `h1` 하나를 **`page.tsx`에서** 쓴다. 클라이언트 폼이나 공통 UI 안에 두지 않는다. 단계를 건너뛰지 않는다.
- **인터랙티브 요소:**
  - 동작은 `<button type>`, 이동은 `next/link`를 쓴다. `div onClick`은 금지한다.
  - 아이콘 버튼에는 `aria-label`을 둔다.
  - 상태에 맞게 `aria-pressed`·`aria-expanded`·`aria-checked`·`aria-current="page"`를 쓴다.
- **폼:**
  - 모든 입력에 화면에 보이는 `<label>`을 단다. placeholder로 대신하지 않는다.
  - 묶음은 `fieldset`+`legend`로 만든다.
  - 오류는 `aria-describedby`+`aria-invalid`로 연결하고, 실패하면 첫 오류 필드로 포커스를 옮긴다.
- **이미지:** 의미 있는 이미지는 내용을 설명하는 `alt`, 장식은 `alt=""`. "이미지"로 시작하지 않는다.
- **키보드:**
  - Tab만으로 모든 기능을 쓸 수 있어야 하고, `:focus-visible`을 유지한다. `tabIndex`는 0·-1만 쓴다.
  - 대화상자는 `<dialog>`+`showModal()`로 만들고, 닫히면 트리거로 포커스를 돌려준다.
- **동적 안내:** 결과·flash는 `role="status"`, 오류는 `role="alert"`로 알린다. live region은 미리 DOM에 둔다. 로딩 영역에는 `aria-busy`를 둔다.

### 5-5. SEO

- **루트 metadata:** `metadataBase`(`NEXT_PUBLIC_SITE_URL`), `title: { default: "삼다방", template: "%s | 삼다방" }`, description, `openGraph`(siteName·locale `ko_KR`·이미지)를 둔다. page에서는 `title: "메뉴"`처럼 이름만 쓴다.
- **색인 범위:** 3장의 색인 대상만 title·description·canonical을 갖고 sitemap에 넣는다. 나머지는 `robots: { index: false }`로 처리하고, 고객·관리자는 그룹 layout에서 설정한다. robots.txt의 disallow로 대신하지 않는다.
- **canonical:**
  - 목록은 필터·정렬·검색어·flash를 빼고 `page`만 유지한다.
  - 상세는 자기 경로를 쓴다. 데이터가 없으면 `notFound()`를 부른다.
  - 상세는 `cache()`로 감싼 조회를 `generateMetadata`와 page가 함께 쓴다.
- **크롤링:** 핵심 콘텐츠는 서버에서 렌더한다. 이동과 페이지네이션은 `<a href>`(Link)로 만든다.
- **robots·sitemap:** `app/robots.ts`는 `/api/`를 disallow하고 sitemap 경로를 알린다. `app/sitemap.ts`에는 색인 대상과 메뉴 상세만 넣는다.
- **배포 후:** 구글·네이버 서치 콘솔에 등록하고, 링크 미리보기(OG)를 확인한다.

### 5-6. 데이터·Server Actions·API

- **API 규약:**
  - 엔드포인트·DTO 필드명·오류·페이지네이션은 백엔드 청사진과 DTO 코드를 따른다. 백엔드 청사진에 없는 API는 가정하지 않는다.
  - 프론트 타입은 DTO와 이름·타입을 맞춘다. 메뉴 id는 Long, `supportsHot`/`supportsIced`, 장바구니는 `iced`, `categoryId`/`categoryName`이다.
  - 오류는 `{ code, message }`이다(`VALIDATION_ERROR`·`INVALID_REQUEST` 400, `NOT_FOUND` 404, `CONFLICT` 409). 금액은 원 단위 정수, 시각은 ISO 8601이다.
  - 관리자 메뉴 목록 응답은 `{ items, page, size, totalElements, totalPages }`이다.
- **조회:**
  - 서버 컴포넌트에서 `_lib/api.ts`를 통해 조회한다. 공통 요청기는 `app/_lib/api/`(`server-only`)에 두고, `cookies()`를 헤더에 붙여 백엔드를 호출한다.
  - 컴포넌트에서 `fetch`를 직접 호출하지 않는다.
  - 응답은 `_lib/api.ts`에서 검증하고 화면에는 정규화된 타입만 넘긴다.
- **목에서 API로 전환:** 쌍 단위로 한다(8장). 목 데이터는 이관하지 않는다. 모든 쌍을 전환하면 `app/_lib/mock/`을 삭제한다.

**공통 요청기** (Server Action과 서버 컴포넌트가 함께 쓴다)

```ts
// app/_lib/api/client.ts
import "server-only";
import { cookies } from "next/headers";

export type ApiError = { code: string; message: string };
export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly error: ApiError) { super(error.message); }
}

// 서버 간 호출에는 브라우저 쿠키가 자동으로 붙지 않으므로 직접 넣는다.
export async function apiFetch<T>(path: `/api/v1/${string}`, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${process.env.API_ORIGIN}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", cookie: (await cookies()).toString(), ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new ApiRequestError(response.status, await response.json());
  return response.status === 204 ? (undefined as T) : response.json();
}
```

**Server Action 규칙**

변경은 Server Action으로 하고, 흐름은 `권한 확인 → 입력 검증 → API 호출 → revalidatePath → redirect` 순서다.

1. **첫 단계에서 `requireRole`로 권한을 확인한다.** 관리자 주문 액션은 삭제 쿠키 전달을 위해 기존 `createAuthSession().current()`를 사용하는 지역 `requireOrderAdministrator`에서 같은 활성 상태·관리자 역할을 검사한다. Server Action은 누구나 직접 호출할 수 있는 POST 엔드포인트다. 화면에서 버튼을 숨기는 것만으로는 막을 수 없다.
2. **필드 검증은 프론트에서도 한다.** 백엔드 `VALIDATION_ERROR`는 메시지 하나만 주므로, 필드 옆 오류(`aria-describedby`)와 첫 오류 필드 포커스는 `validate()`로 만든다.
3. **실패하면 입력값(`values`)을 함께 돌려준다.** React 19의 action 폼은 제출 후 초기화되므로, 폼은 `defaultValue={state.values.x}`로 다시 채운다.
4. **`try`는 API 호출만 감싼다.** `redirect()`는 내부적으로 예외를 던져 동작하므로 `try` 안에 넣으면 이동이 막힌다. `ApiRequestError`만 상태로 돌려주고, 나머지 예외는 다시 던져 `error.tsx`가 처리하게 한다.
5. **바뀐 데이터를 보여 주는 경로를 모두 `revalidatePath`로 갱신한다.** 예: 메뉴 → `/admin`, `/admin/menus`, `/menus`. 주문 상태 → 관리자·고객 주문 목록과 상세.
6. **성공하면 `redirect`와 flash 쿼리로 결과를 알린다.** 수정처럼 id가 필요하면 `updateMenu.bind(null, id)`로 묶어 넘긴다.

```ts
// app/admin/menus/_actions.ts
"use server";

export async function createMenu(_previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", "/admin/menus/new");                    // 1
  const { state, request } = validate(formData);                     // 2: state = { values, errors }
  if (!request) return state;                                        // 3

  let created: MenuResponse;
  try {                                                              // 4
    created = await apiFetch<MenuResponse>("/api/v1/admin/menus", { method: "POST", body: JSON.stringify(request) });
  } catch (error) {
    if (error instanceof ApiRequestError) return { ...state, message: error.error.message }; // 3: 입력값 유지
    throw error;
  }
  revalidatePath("/admin");                                          // 5
  revalidatePath("/admin/menus");
  revalidatePath("/menus");
  redirect(`/admin/menus?created=${created.id}`);                    // 6
}
```

클라이언트 폼은 `const [state, formAction, pending] = useActionState(createMenu, initialState)`로 연결하고, `<form action={formAction}>`에서 `pending` 동안 제출 버튼을 막아 중복 제출을 막는다. 현재 [MenuForm.tsx](../frontend/app/admin/menus/_components/MenuForm.tsx)가 이 구조다.

### 5-7. 인증·백엔드 연동

2026-10-25 인증 6단계에서 적용했다. 로그인·로그아웃의 실제 처리는 표준 Security 필터이며, AuthController 매핑은 인증 영역의 소유를 뜻한다. 상세 계약은 [인증 청사진](../backend/docs/2026-10-22-auth-blueprint.md)을 따른다.

- `app/_lib/api/auth.ts`는 server-only이며 변경 요청에 CSRF·쿠키를 연결한다. BackendSession은 액션마다 새 쿠키 저장소를 만들고 모든 Set-Cookie를 유지하며 후속 요청에 갱신된 ID를 전달한다. 인증 변경에 위의 단순 조회 예시 요청기를 사용하지 않는다.
- 가입·로그인 액션은 공개 인증 진입점이므로 기존 회원 requireRole 없이 입력 검증·백엔드 인증을 수행한다. 보호된 업무 액션은 첫 단계 권한 검사를 유지한다.
- 로그인 후 새 CSRF를 받고, 가입만 성공한 경우 로그인 재시도로 안내한다. 비밀번호는 action state·응답·브라우저 저장소에 넣지 않는다.
- SSR 회원 조회는 no-store이며 React cache는 한 렌더 안의 중복만 제거한다. Proxy는 보호 경로의 상태·역할을 확인하고 만료 쿠키를 반영한다. Server Components에서는 쿠키를 변경하지 않는다.
- 다른 탭에는 임의 변경 알림만 전송한다. 탭 복귀·뒤로 가기에서 서버 인증을 새로 확인한다.

- 인증 정보는 httpOnly 쿠키에 두고, localStorage에 두지 않는다.
- 브라우저 호출은 `next.config.ts` rewrites로 프록시한다. 대상은 **`/api/v1/:path*`만**이다. `/api/*` 전체를 넘기면 기존 라우트 핸들러가 가려진다.
- 프록시 없이 호출하면 포트만 달라도 CORS 대상이다. 그때는 `credentials: "include"`, 백엔드 `allowCredentials`, 정확한 origin이 필요하다.
- `proxy.ts`가 `/cart`, `/checkout`, `/my/*`, `/admin/*`를 1차로 보호하고, 최종 권한 검증은 백엔드가 한다. Server Action의 권한 확인은 계속 유지한다.
- Server Action 요청(`Next-Action` 헤더가 있는 POST)은 Proxy가 redirect하지 않고 그대로 넘긴다. Proxy의 HTTP redirect는 Action 응답으로 해석되지 않아 화면이 멈추기 때문이다. 세션 만료·권한 없음은 각 Action의 `requireRole` 등이 Next의 `redirect()`로 처리한다(2026-10-27, #94).

### 5-8. 기타

- 이미지는 `next/image`, 폰트는 `next/font`, 무거운 라이브러리는 `dynamic import`를 쓴다.
- 리스트 `key`에 index를 쓰지 않는다. `any`는 금지하고, 외부 입력은 검증한다.
- 브라우저에 노출하는 환경변수는 `NEXT_PUBLIC_`만 쓰고, `.env.local.example`을 커밋한다.
- GLOSSARY 용어를 쓴다: **기타 카테고리**("기본 카테고리" 아님), **주문 대상 항목**("선택된 메뉴" 아님), **카운터 결제수단**(실제 결제 완료가 아님).

## 6. 확정이 필요한 항목

### 6-1. 청사진의 확정 필요 항목 (원문 9개 유지)

| 우선 | 항목 | 현재 코드·백엔드 상태 |
| --- | --- | --- |
| 높음 | 주문·결제의 상태와 취소 가능 조건 | 상태 5종, 인접 이동. 관리자 프론트/API 모두 `received`만 사유를 필수 입력해 취소하고 회원에게 표시. 서버 선택지·버전 적용(2026-10-27). 고객 취소는 제공하지 않는다(2026-10-27 확정) |
| 높음 | 결제 제공자, 결제수단 저장·수정 방식 | 실제 결제 없음, 카운터 결제수단만. 보류(Q1) |
| 높음 | 역할별 가입·로그인 방식 | 목: 가입은 고객만, 이메일·비밀번호. 관리자 생성은 백엔드 계획 |
| 높음 | 뮤직박스 신청 권한·사연 공개·대기 순서 | 회원만, 이름 공개, 글자 수 제한, 관리자가 순서 결정. 공개 동의는 없음 |
| 높음 | 뮤직박스 음원 출처·사용 권한·동기화 | YouTube, 서버 시각 동기화. 사용 권한 미정 |
| 높음 | 장바구니 세부 요구사항 | 서버 저장, 메뉴·온도별 한 줄, 1~20(넘으면 20으로 맞춤), 고객만 |
| 중간 | 메뉴 카테고리·옵션·품절 정책 | 코드: 카테고리 여러 개, `hot`/`ice`. 백엔드: 카테고리 하나, `supportsHot`/`supportsIced`, 숨김 삭제 |
| 중간 | 리뷰 작성 조건·평점·이미지, 관리자 리뷰 등록 의미 | 범위 밖 |
| 중간 | 관리자 결제 관리 범위 | 백엔드 9.x 세부 없음 |

### 6-2. 통합하면서 보류한 항목

| 항목 | 결정 주체 |
| --- | --- |
| 백엔드 인증 방식(세션·토큰, CSRF, 쿠키 이름) | 백엔드 |
| 사이트 도메인, OG 이미지, 백엔드 주소 환경변수 이름 | 팀 |
| 메뉴 `nameEn` 유지, 카테고리 단일·복수 (공개 메뉴 필터는 `categoryId`로 정함) | 백엔드 협의 |
| 관리자 메뉴 카테고리 목록의 컨트롤러 | 백엔드 협의 |
| GLOSSARY에 없는 용어: 고객·회원·방문자, 인덱스, 주문·뮤직박스 상태 라벨 | GLOSSARY 관리자 |

## 7. 진행 현황

단계 구성은 청사진 8장을 따르고, 판정은 2026-10-22 코드 기준이다. 모든 구현은 목 저장소 기준이며, API 연결은 8장에서 추적한다.

| 단계 | 상태 | 남은 작업 |
| --- | --- | --- |
| 선행 준비, 1단계 관리자 메뉴, 2단계 고객 메뉴 조회 | 완료 | — |
| 3단계 장바구니·주문 | 완료 | — |
| 4단계 결제 | 부분 | 내역·금액·카운터 결제수단·중복 제출 방지는 있음. 결제수단 CRUD, 실제 결제·완료·재시도, 결제 취소 미구현(보류 Q1) |
| 5단계 관리자 주문 처리·고객 확인 | 구현(흐름 점검은 코드로 확인 불가) | 결제된 주문 흐름 점검 |
| 6단계 뮤직박스 | 6-3~6-5 완료, 6-1·6-2 부분 | 사연 공개 동의, 접수 제한, 음원 사용 권한, 실제 음원으로 두 세션 검증(6-6) |
| 7단계 리뷰 | 미구현 | 범위 밖 |
| 8단계 회원 정보 | 관리자 회원·정지 반영 완료 | `/profile/update` 수정 화면 |
| 9단계 품질 확인 | 코드로 확인 불가 | 전체 시나리오, 모바일, 접근성 점검. `e2e/` 없음 |

## 8. 규칙 갭과 작업 분배표

코드에서 확인한 갭만 적었다.

### 8-1. 공통 갭

| 갭 | 위치 |
| --- | --- |
| 루트 metadata에 template·metadataBase·openGraph 없음. 페이지 metadata는 3개뿐이고 서비스명을 직접 붙임 | `app/layout.tsx`, `signup`, `admin/users`, `admin/users/[id]` |
| noindex, `robots.ts`, `sitemap.ts`, 본문 바로가기 없음 | `app/` |
| `(public)` 페이지 6개가 `<main>`을 직접 그리고, 그룹 layout은 children만 반환 | `(public)/layout.tsx` |
| h1이 page 밖에 있음 | `SignupForm.tsx`, 공통 `StatePanel`(`/forbidden`, `error`, `not-found`) |
| 인증 요청기·Proxy·`/api/v1` rewrites 완료. 라우트별 `loading`·`error`는 남음 | `frontend/` |
| `MenuCard`를 `(public)`만 쓰는데 `app/_components`에 있음 | `app/_components/MenuCard.tsx` |

### 8-2. 쌍별 작업

2026-10-25 사용자의 명시적 요청에 따라 에이전트가 인증 단계 PR #71~#74를 순서대로 `feature/session-auth`에 통합했다. 이번 통합은 사람 머지 일반 규칙의 예외다. 2026-10-26 최신 `develop`을 반영하고 공개 메뉴 GET 접근 정책을 수정했다. 최종 [PR #61](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/61)은 리뷰 대상으로 전환하며, `develop` 반영은 사람이 머지한다.

| 쌍 | 규칙 갭 | 남은 기능 작업 | 선행 |
| --- | --- | --- | --- |
| `/login`·`/signup` ↔ Auth | 인증 API·목 세션 교체·필드 오류·metadata/noindex 완료. `<main>`의 layout 이동은 공통 갭으로 남음 | 인증 6단계 브라우저 검증 완료 | `feature/session-auth` 통합 완료 |
| `/my` ↔ my/Users | 실제 본인 조회·로그아웃·숫자 ID·metadata/noindex 완료 | 인증 6단계 검증 완료 | `feature/session-auth` 통합 완료 |
| `/profile/update` ↔ my/Users | — | 화면 신규 | `/my` |
| `/admin/users*` ↔ admin/Users | title 직접 표기 | API 연결 | Auth |
| `/admin/users/new` ↔ admin/Users | — | 화면 신규 | `/admin/users` |
| `/admin/categories` ↔ **admin/Categories** | metadata·"기타 카테고리" 문구 완료 | API 연결 완료(#86·#87, 기타 맨 밑 고정). 백엔드 꺼짐 화면은 `proxy.ts` 공통 작업으로 남음 | — |
| `/admin/menus*` ↔ **admin/Menus** | 목록·등록 metadata, `categoryId`·`page` 완료. 상세·수정 `generateMetadata` 없음 | API 연결 완료([계획](admin/menus/2026-10-27-frontend-admin-menus.md)). 이미지 파일 업로드는 저장소 결정 후 | — |
| `/menus` ↔ Menus | metadata·canonical 없음, `<main>`이 page에 있음 | 공개 메뉴 API | 백엔드 공개 Menus |
| `/menus/[slug]` ↔ Menus | 대화상자 이동이 `router.push`(`OrderPanel`) | — | — |
| `/` ↔ **Home** | `<main>`이 page에 있음 | 추천 메뉴·뮤직박스 칸 index API 연결 완료. 변경 감지 폴링만 공개 Songs(2-3) | — |
| `/cart` ↔ my/CartItems | metadata 없음 | — | — |
| `/checkout` ↔ my/Orders | 화면 전체가 클라이언트, `cart` CSS import, "주문 / 결제"·"결제하기" 용어 | `POST /orders`(`cartItemIds`·수령 방식·결제수단·요청사항). 주문 대상은 `?cartItemIds=`로 받아 서버 장바구니에서 고른다 | 백엔드 `/api/v1/orders` 접근 정책 |
| `/my/orders*` ↔ my/Orders | metadata 없음 | API 연결·본인 주문 취소 사유 표시. 고객 직접 취소 없음 | `/checkout` |
| `/admin/orders*` ↔ **admin/Orders** | API 연결·컴포넌트 분리·보이는 label·title/noindex·loading/error 적용 | 실제 관리자 세션/CSRF, 세 그룹 DB 페이지·전체 요약, 숫자 ID·스냅샷·`iced`·버전/서버 선택지·사유 필수 접수 취소·회원 조회 구현(2026-10-27). [취소 사유 연동](admin/orders/2026-10-27-order-cancellation-reason.md). [계획·검증 결과](admin/orders/2026-10-26-frontend-order-management.md), [계약](admin/orders/2026-10-26-backend-order-management.md) | 공통 skip link/메타데이터·관리자 홈 집계는 별도. 고객 전체 흐름은 D·회원 FK 통합 후 검증 |
| `/musicbox` ↔ **Songs** | metadata·canonical 없음, `<main>`이 page에 있음. 공유 컴포넌트는 `app/_components`로 옮김, `loading`·`error` 추가 | 공개 조회·신청·`revision` 폴링 연결 완료([계획](musicbox/2026-10-27-frontend-customer-songs.md)) | — |
| `/my/songs` ↔ **my/Songs** | metadata 없음. `loading`·`error` 추가 | 조회·삭제 API 연결 완료, 현재 곡은 보조 조회(2-3) | — |
| `/admin/songs` ↔ **admin/Songs** | metadata 없음, page 203줄 | 선곡 API 연결 완료(#85). 변경 요청 CSRF·`revision` 폴링 보완(2026-10-27) | — |
| `/admin` (없음) | metadata 없음 | 메뉴 현황 API 연결 완료(2026-10-27). 주문·신청곡 건수는 관리자 API로 집계 | 관리자 세 쌍 |
| `/forbidden` (없음) | h1이 `StatePanel` 안, noindex 없음 | — | — |

**권장 순서:**
1. 공통 갭(8-1)과 요청기·프록시
2. 인증: `/login`·`/signup`·`/my`
3. `/admin/categories` → `/admin/menus`
4. `/menus` → `/menus/[slug]` → `/`
5. `/cart` → `/checkout` → `/my/orders` → `/admin/orders`
6. `/musicbox` → `/my/songs` → `/admin/songs`
7. `/admin/users` → `/profile/update`·`/admin/users/new`
8. `/admin`

## 9. PR 체크리스트

- [ ] **매핑:** PR이 하나의 쌍(또는 같은 주 컨트롤러 공유 쌍)을 다루고, 컨트롤러·엔드포인트가 2장과 일치한다. 보조 컨트롤러는 2-3에 있는 것만 쓴다
- [ ] **URL 변경:** URL을 바꿨다면 매핑표와 백엔드 청사진을 함께 고쳤다
- [ ] **용어:** 화면 문구가 GLOSSARY를 따른다
- [ ] **구조:** 라우트 전용 코드는 라우트 안에 있고, 공통 코드는 두 곳 이상에서 쓴다. 다른 라우트의 `_components`를 import하지 않고, page는 조립만 한다
- [ ] **컴포넌트:** `"use client"`는 leaf에만 있다. 공통 UI는 도메인·API·URL에 의존하지 않고, 래퍼나 미리 만든 추상화가 없으며, 네이밍·export 규칙을 따른다
- [ ] **데이터·API:** 엔드포인트·타입이 백엔드 청사진·DTO와 일치하고, 없는 API를 가정하지 않았다
- [ ] **변경:** 권한을 확인하는 Server Action으로 하고, `revalidatePath`로 관련 경로를 모두 갱신한다
- [ ] **상태:** 공유 의미가 있는 상태는 URL에 두고 page에서 검증한다. URL과 `useState`에 중복으로 두지 않고, 서버 데이터를 전역 상태에 복사하지 않는다
- [ ] **랜드마크:** skip link가 있고, `main`은 그룹 layout에 하나, h1은 page에 하나이며 헤딩 순서를 지킨다
- [ ] **요소:** button·a를 의미대로 쓰고, 아이콘 버튼에 `aria-label`, 이미지에 `alt`가 있다. 보이는 label과 `aria-describedby` 오류 연결이 있다
- [ ] **키보드·안내:** 키보드만으로 쓸 수 있고 포커스가 보이며, 대화상자 포커스를 관리한다. 동적 변경은 `status`·`alert`로 안내하고, 명도 대비 4.5:1, 색상만으로 상태를 구분하지 않는다
- [ ] **SEO:** 공개 페이지에 고유한 title·description·canonical이 있고, 핵심 콘텐츠가 초기 HTML에 있으며, 이동은 Link다. 없는 데이터는 `notFound()`, 로그인·인증 화면은 noindex, 공개 페이지는 sitemap에 있다
- [ ] **검증:** `npm run lint`, `npm run typecheck`, Lighthouse·axe DevTools, Tab 키로 전체 흐름 확인
