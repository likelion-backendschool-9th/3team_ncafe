# 삼다방 프론트엔드 개발 문서

> 작성일: 2026-10-22. 이 문서는 아래 네 문서를 하나로 합친 프론트엔드 작업 기준이다.
>
> | 출처 | 이 문서에서 쓰는 내용 |
> | --- | --- |
> | [frontend-청사진.md](./frontend-청사진.md) | 기능 범위, 사용자 흐름, 확정이 필요한 항목, 개발 순서 |
> | FRONTEND_GUIDE.md (통합 후 삭제) | 개발 규칙. 5장에서 실제 구조에 맞춰 옮겼으며, 이제 5장이 규칙의 원본이다. |
> | [백엔드 청사진](../backend/docs/2026-10-20-backend-blueprint.md) | 데이터·API, 컨트롤러 구성. **데이터·API는 이 문서가 기준**이다. 최신본은 `origin/develop`(2e6ddf1)에 있다. |
> | [GLOSSARY.md](../GLOSSARY.md) | 용어. **용어는 이 문서가 기준**이다. |
>
> 라우트, 라우트-컨트롤러 매핑, 진행 현황은 2026-10-22 코드 검증 결과(프론트 `develop` e1e935c, 백엔드 `origin/develop` 2e6ddf1)를 따른다. `frontend-청사진.md`의 URL 표와 체크리스트는 이 검증 전 상태로 남아 있으므로, 두 문서가 다르면 이 문서의 2·3·7장을 따른다.
>
> 가이드와 백엔드 청사진이 가리키는 `backend/docs/blueprint.md`는 존재하지 않는다. 실제 파일은 `backend/docs/2026-10-20-backend-blueprint.md`다.

---

## 1. 개요

### 1-1. 서비스

삼다방은 고객이 메뉴를 탐색하고 장바구니에 담아 주문하며, 뮤직박스에 사연과 신청곡을 남길 수 있는 다방 서비스다. 관리자는 회원·카테고리·메뉴·주문과 뮤직박스 선곡을 관리한다. 프론트엔드는 **Next.js App Router(16.3.5) + React 19 + TypeScript `strict`**로 구성한다.

청사진은 고객의 주문·결제·리뷰 관리를 범위로 적었다. 최신 WBS를 따르는 백엔드 청사진은 다음과 같이 범위를 조정했다.

- **실제 결제·결제수단 CRUD(WBS 7~8):** 보류(백엔드 Q1). 주문서에서는 카운터 결제수단만 고른다.
- **고객 주문 취소(WBS 6.2):** 보류(백엔드 Q2).
- **리뷰:** 최신 WBS에 없어 범위 밖이다.
- **배달:** 2026-10-08에 범위에서 제거하고 뮤직박스로 대체했다.

### 1-2. 역할별 기능 범위

"청사진 출처"는 청사진의 WBS 번호, "최신 WBS"는 백엔드 청사진의 번호다. 두 번호가 다르면 최신 WBS를 따른다.

| 역할 | 기능 범위 | 청사진 출처 | 최신 WBS | 현재 상태 |
| --- | --- | --- | --- | --- |
| 비회원/회원 | 가입, 로그인, 로그아웃, 내 정보 조회·수정 | 1.x | 1.1~1.5 | 가입·로그인·로그아웃·조회 구현(목). 수정 미구현 |
| 관리자 | 회원 목록·상세·상태 변경 | 2.x | 2.1~2.3 (관리자 생성은 DB 설계 확장) | 구현(목). 관리자 생성 미구현 |
| 관리자 | 카테고리 조회·등록·이름 수정·순서 변경·삭제 | (없음) | 13.1~13.4 | 구현(목). 백엔드 API 있음 |
| 관리자 | 메뉴 등록·목록·상세·수정·삭제 | 3.x | 3.1~3.5 | 구현(목). 백엔드 API 있음 |
| 고객 | 메뉴 목록·상세 | 4.x | 4.1~4.3 | 구현(목) |
| 고객 | 장바구니 | 15.0: 제목만 기재 | 14.1~14.4 (14.5 주문 대상 체크는 화면 상태) | 구현(브라우저 localStorage) |
| 고객 | 주문 등록·목록·상세·취소 | 6.x | 6.1, 6.3~6.4 (6.2 보류) | 구현(목). 고객 취소는 백엔드 보류 |
| 고객 | 주문 결제·결제 취소, 결제수단 등록·조회·수정·삭제 | 7.x, 8.x | 보류(Q1) | 카운터 결제수단 선택만 구현 |
| 관리자 | 주문 목록·상세·상태 변경·취소 | 5.x | 5.x/12.x | 구현(목) |
| 방문자/고객 | 뮤직박스 사연·신청곡 접수와 대기·선곡 확인 | 변경된 제품 범위 | 11.x | 구현(목). 신청은 회원만 |
| 관리자 | 신청곡 확인, 음원 연결, 선곡·재생 완료 처리 | 변경된 제품 범위 | 10.x | 구현(목). 음원은 YouTube 링크 |
| 관리자/고객 | 리뷰 관리 및 작성·수정·삭제·조회 | 13.x, 14.x | 없음(범위 밖) | 미구현 |

### 1-3. 현재 데이터·인증 상태

- **백엔드 연결:** 프론트에서 `/api/v1` 호출은 0건이다. 백엔드에는 `admin/CategoriesController`와 `admin/MenusController`만 구현돼 있다.
- **목 인증:** HMAC 서명 httpOnly 쿠키(`ncafe_mock_session`)를 쓴다 ([session.ts](../frontend/app/_lib/session/session.ts)). page·layout·Server Action마다 `requireRole`로 역할을 검사한다.
- **목 저장소:** `.data/*.json` 파일에 저장한다 ([app/_lib/mock/](../frontend/app/_lib/mock/)). 운영 환경에서는 예외를 던진다.
- **장바구니:** 브라우저 localStorage의 React Context에 저장한다 ([CartContext.tsx](../frontend/app/_lib/cart/CartContext.tsx)).
- **메뉴 이미지 업로드:** 개발 환경에서만 `public/uploads/menus`에 저장한다.

---

## 2. 라우트-컨트롤러 매핑

### 2-1. 원칙

1. **작업 단위는 "페이지 ↔ 주 컨트롤러" 쌍이다.** 작업 분배, PR, 리뷰를 이 쌍 단위로 한다.
2. **주 컨트롤러**는 그 페이지의 첫 화면을 그리는 조회와 핵심 변경을 맡는 백엔드 컨트롤러다. 근거는 백엔드 청사진의 "프론트 페이지 → 시스템 이름" 표다.
3. **페이지 하나에 주 컨트롤러는 정확히 하나다.** 페이지에서 컨트롤러로 가는 방향이 1:1이다.
4. **한 컨트롤러가 여러 페이지의 주 컨트롤러가 되는 것(N:1)은 허용한다.** 백엔드는 컨트롤러를 화면이 아니라 시스템 단위로 나누기 때문이다. 이런 페이지는 매핑표에 "공유"로 표시한다. 공유 컨트롤러의 엔드포인트를 바꾸면 그 컨트롤러를 쓰는 모든 페이지 담당자가 리뷰한다.
5. **다음 두 경우는 [2-3 예외 목록](#2-3-예외-목록)에 있는 것만 인정한다.**
   - 보조 컨트롤러: 페이지 안의 부수 동작이 다른 시스템의 API를 부르는 경우
   - 주 컨트롤러 없음
6. **페이지 URL을 추가·변경·삭제하면 대응 컨트롤러도 함께 바꾼다.** 프론트 단독으로 URL을 바꾸지 않는다. 먼저 백엔드 청사진의 페이지 표와 이 문서의 매핑표를 함께 고친다.
7. **새 예외나 새 엔드포인트가 필요하면 백엔드와 합의한다.** 백엔드 청사진에 먼저 반영한 뒤 2-3에 추가한다.

### 2-2. 매핑표

"백엔드"와 "프론트" 열은 2026-10-22 코드 기준 구현 여부다. 엔드포인트는 백엔드 청사진의 계약 초안이며, "백엔드 구현"이 "있음"인 행만 코드로 존재한다.

| 페이지 URL | 주 컨트롤러 | 엔드포인트 | 백엔드 | 프론트 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/` | `HomeController` | `GET /api/v1/index/menus`, `GET /api/v1/index/songs` | 없음 | 구현(목) | |
| `/login` | `AuthController` | `POST /api/v1/auth/login` | 없음 | 구현(목) | 공유(Auth) |
| `/signup` | `AuthController` | `POST /api/v1/auth/signup` | 없음 | 구현(목) | 공유(Auth) |
| `/menus` | `MenusController`(공개) | `GET /api/v1/menus`(`q`, `category`, `status`, `sort`), `GET /api/v1/menus/categories` | 없음 | 구현(목) | 공유(공개 Menus) |
| `/menus/[slug]` | `MenusController`(공개) | `GET /api/v1/menus/{slug}` | 없음 | 구현(목). `slug` 자리에 UUID id를 씀 | 공유(공개 Menus), 보조 있음 |
| `/musicbox` | `SongsController`(공개) | `GET /api/v1/musicbox/songs`, `GET /api/v1/songs/now` | 없음 | 구현(목) | 보조 있음 |
| `/cart` | `my/CartItemsController` | `GET /api/v1/cart/items`, `PUT`·`DELETE /api/v1/cart/items/{id}` | 없음 | 구현(localStorage) | |
| `/checkout` | `my/OrdersController` | `POST /api/v1/orders` | 없음 | 구현(목) | 공유(my/Orders) |
| `/my` | `my/UsersController` | `GET /api/v1/my` | 없음 | 구현(목, 조회만) | 보조 있음 |
| `/my/orders` | `my/OrdersController` | `GET /api/v1/orders` | 없음 | 구현(목) | 공유(my/Orders) |
| `/my/orders/[id]` | `my/OrdersController` | `GET /api/v1/orders/{id}` | 없음 | 구현(목) | 공유(my/Orders). 고객 취소 엔드포인트 없음(Q2) |
| `/my/songs` | `my/SongsController` | `GET /api/v1/my/songs`, `DELETE /api/v1/my/songs/{id}` | 없음 | 구현(목) | |
| `/admin` | 없음 | 관리자 Menus·Orders·Songs 목록 API 조합 | — | 구현(목) | 예외 |
| `/admin/users` | `admin/UsersController` | `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}` | 없음 | 구현(목) | 공유(admin/Users) |
| `/admin/users/[id]` | `admin/UsersController` | `GET`·`PUT /api/v1/admin/users/{id}` | 없음 | 구현(목) | 공유(admin/Users) |
| `/admin/categories` | `admin/CategoriesController` | `GET`·`POST /api/v1/admin/categories`, `PUT`·`DELETE /api/v1/admin/categories/{id}`, `PUT /api/v1/admin/categories/order` | **있음** | 구현(목, API 미연결) | |
| `/admin/menus` | `admin/MenusController` | `GET /api/v1/admin/menus`(`q`, `categoryId`, `status`, `sort`, `page`, `size`), `DELETE /api/v1/admin/menus/{id}` | **있음** | 구현(목, API 미연결) | 공유(admin/Menus) |
| `/admin/menus/new` | `admin/MenusController` | `POST /api/v1/admin/menus` | **있음** | 구현(목, API 미연결) | 공유(admin/Menus) |
| `/admin/menus/[id]` | `admin/MenusController` | `GET`·`DELETE /api/v1/admin/menus/{id}` | **있음** | 구현(목, API 미연결) | 공유(admin/Menus) |
| `/admin/menus/[id]/edit` | `admin/MenusController` | `GET`·`PUT /api/v1/admin/menus/{id}` | **있음** | 구현(목, API 미연결) | 공유(admin/Menus) |
| `/admin/orders` | `admin/OrdersController` | `GET /api/v1/admin/orders`, `PUT /api/v1/admin/orders/status`, 관리자 취소(계약 미정) | 없음 | 구현(목) | 공유(admin/Orders) |
| `/admin/orders/[id]` | `admin/OrdersController` | `GET /api/v1/admin/orders/{id}`, `PUT /api/v1/admin/orders/status`, 관리자 취소(계약 미정) | 없음 | 구현(목) | 공유(admin/Orders) |
| `/admin/songs` | `admin/SongsController` | `GET /api/v1/admin/songs`, `PUT /api/v1/admin/songs/{id}/cancel`, `POST /api/v1/admin/songs/playlist`, `PUT /api/v1/admin/songs/playlist/{id}/order`, `PUT /api/v1/admin/songs/playlist/{id}`, `POST /api/v1/admin/songs/playlist/{id}/play`, `POST /api/v1/admin/songs/current/finish`, `POST /api/v1/admin/songs/current/cancel` | 없음 | 구현(목) | |
| `/forbidden` | 없음 | — | — | 구현 | 예외(프론트 전용) |

**계획됐거나 청사진에만 있는 페이지**

| 페이지 URL | 주 컨트롤러 | 엔드포인트 | 상태 |
| --- | --- | --- | --- |
| `/profile/update` (청사진 원안: `/profile/edit`) | `my/UsersController` | `PUT /api/v1/users/{id}` | 프론트·백엔드 미구현. 백엔드 청사진의 URL을 채택함 |
| `/admin/users/new` | `admin/UsersController` | `POST /api/v1/admin/users` | 프론트·백엔드 미구현. DB 설계 확장 항목이며 청사진에는 없음 |
| `/checkout/complete` | 없음 | — | 미구현(청사진 설계 제안). 현재는 주문 후 `/my/orders/[id]?placed=1`로 이동 |
| `/profile/payments`, `/profile/payments/new`, `/profile/payments/[id]/edit` | 없음 | — | 미구현. 백엔드 보류(Q1) |
| `/orders/[id]/review`, `/profile/reviews`, `/profile/reviews/[id]/edit`, `/admin/reviews`, `/admin/reviews/[id]` | 없음 | — | 미구현. 리뷰는 최신 WBS·백엔드 범위 밖 |

**청사진 URL과 실제 URL의 대응**

| 청사진 URL | 실제 URL |
| --- | --- |
| `/menus/[id]` | `/menus/[slug]` |
| `/orders`, `/orders/[id]` | `/my/orders`, `/my/orders/[id]` |
| `/music-box` | `/musicbox` |
| `/profile` | `/my` |
| `/admin/music-box` | `/admin/songs` |
| (없음) | `/my/songs`, `/admin/categories`, `/forbidden` |

**페이지가 아닌 Next 라우트 핸들러**

| 경로 | 역할 | 비고 |
| --- | --- | --- |
| `/api/music-box/version` | 뮤직박스 변경 감지용 폴링 ([route.ts](../frontend/app/api/music-box/version/route.ts)) | 목 저장소 기준이다. 백엔드 연결 시 대체할 방법은 6장에서 정한다. |
| `/api/story-speech` | 외부 Typecast TTS 호출 ([route.ts](../frontend/app/api/story-speech/route.ts)) | 백엔드와 무관하다. |

### 2-3. 예외 목록

| 종류 | 페이지 | 컨트롤러·엔드포인트 | 근거 |
| --- | --- | --- | --- |
| 보조 컨트롤러 | `/menus/[slug]` | `my/CartItemsController` `POST /api/v1/menus/{id}/cart/items` | 백엔드 청사진: 메뉴 상세의 담기 동작 |
| 보조 컨트롤러 | `/musicbox` | `my/SongsController` `POST /api/v1/musicbox/songs` | 백엔드 청사진: `/musicbox`의 곡 신청 |
| 보조 컨트롤러 | `/my` | `AuthController` `POST /api/v1/auth/logout` | 백엔드 청사진: `/my`의 로그아웃 동작 |
| 주 컨트롤러 없음 | `/admin` | 관리자 Menus·Orders·Songs 목록 API 조합 | 백엔드 청사진: 대시보드 전용 API를 만들지 않음 |
| 주 컨트롤러 없음 | `/forbidden` | — | 프론트 전용 권한 안내 화면 |
| 주 컨트롤러 없음 | 결제·리뷰·주문 완료 화면 | — | 백엔드 보류 또는 범위 밖(2-2 계획 표) |

현재 코드에는 컨트롤러를 하나 더 써야 하는 화면이 세 곳 있지만, 백엔드 청사진에 근거가 없어 예외로 인정하지 않는다. [6장](#6-확정이-필요한-항목)에서 정한다.

- `/checkout`: 주문 대상 항목 조회
- `/my/songs`: 현재 곡 표시
- 관리자 메뉴 화면들: 카테고리 선택 목록

---

## 3. 라우트별 명세

공통 표기는 다음과 같다.

- **URL 상태:** 현재 코드가 읽는 값이다. 기본값은 URL에서 생략한다.
- **flash:** 변경 작업 후 결과를 알리는 일회성 쿼리 값이다.
- **SEO:** 5-5의 규칙을 적용한 결과다.
- **랜드마크:** 5-4 규칙과 다른 현재 상태를 함께 적는다.

### 3-1. 공개 영역 `(public)`

#### `/` 사용자 인덱스

- **컨트롤러:** `HomeController` · `GET /api/v1/index/menus`, `GET /api/v1/index/songs` · 근거: 설계 제안, 인덱스 조회
- **화면:** 추천 메뉴 진열(판매 중이면서 추천인 메뉴 최대 16개), 뮤직박스 하이라이트, 메뉴·뮤직박스·로그인으로 가는 링크
- **URL 상태:** 없음
- **로컬·전역 상태:** 없음
- **클라이언트 분리:** `MusicBoxHighlight`(서버) 안의 `DjBooth`, `MusicBoxRefresher`
- **SEO:** 공개·색인. title은 기본값 `삼다방`, canonical `/`
- **랜드마크·h1:** h1 1개. `<main>`을 page가 직접 그림(5-4 갭)

#### `/login` 로그인

- **컨트롤러:** `AuthController` · `POST /api/v1/auth/login` · WBS 1.1
- **화면:** 이메일·비밀번호 로그인. 역할별 착지(고객 `/`, 관리자 `/admin`). 개발 환경에서는 데모 계정을 안내
- **URL 상태:** `next`(로그인 후 이동할 내부 경로, 검증 후 사용), `error=invalid`(flash)
- **로컬·전역 상태:** 없음(서버 폼)
- **클라이언트 분리:** 없음
- **SEO:** `noindex`. title `로그인`
- **랜드마크·h1:** h1 1개. `<main>`을 page가 직접 그림

#### `/signup` 회원가입

- **컨트롤러:** `AuthController` · `POST /api/v1/auth/signup` · WBS 1.3
- **화면:** 이름·이메일·비밀번호·비밀번호 확인. 가입하면 고객으로 로그인 후 `/`로 이동
- **URL 상태:** `error`(`invalid` | `mismatch` | `exists`, flash)
- **로컬 상태:** 입력 확인용 폼 상태(SignupForm). 전역 상태 없음
- **클라이언트 분리:** `SignupForm`
- **SEO:** `noindex`. title `회원가입`
- **랜드마크·h1:** h1이 page가 아니라 `SignupForm` 안에 있음(5-4 갭). `<main>`을 page가 직접 그림

#### `/menus` 메뉴 목록

- **컨트롤러:** `MenusController`(공개) · `GET /api/v1/menus`, `GET /api/v1/menus/categories` · WBS 4.1
- **화면:** 카테고리 탭, 한글·영문 메뉴명 검색, 정렬, 결과 없음·품절 표시
- **URL 상태:**
  - `q`: 검색어. 앞뒤 공백 제거, 100자까지. 기본값 없음
  - `category`: 카테고리. 목록에 없으면 전체
  - `sort`: `newest` | `name` | `price-low` | `price-high`. 기본 `newest`
  - 검색은 GET 폼 제출로 push한다. 카테고리 탭은 `Link`(push)다.
- **로컬·전역 상태:** 없음. 검색 입력은 `defaultValue`를 쓰는 비제어 입력
- **클라이언트 분리:** 없음
- **SEO:** 공개·색인. title `메뉴`, canonical `/menus`(`q`·`category`·`sort` 제외)
- **랜드마크·h1:** h1 1개. `<main>`을 page가 직접 그림

#### `/menus/[slug]` 메뉴 상세

- **컨트롤러:** `MenusController`(공개) · `GET /api/v1/menus/{slug}` · WBS 4.2. 보조 컨트롤러: `my/CartItemsController` 담기
- **화면:** 이미지, 이름(한글·영문), 가격, 설명, 품절·추천·첫 개시 뱃지, 주문서 패널(온도·수량·합계·장바구니 담기). 비로그인이면 로그인 안내 대화상자
- **URL 상태:** params `slug`. 현재는 목 메뉴의 UUID `id`를 넣고, 백엔드 계약은 메뉴 `slug`다.
- **로컬 상태:** 온도, 수량(1~20), 대화상자 열림. 전역 상태: 장바구니 Context(전환 대상, 5-2)
- **클라이언트 분리:** `OrderPanel`, `CartAddedDialog`, `LoginRequiredDialog`, `BackButton`
- **SEO:** 공개·색인. title은 메뉴명, canonical `/menus/{slug}`. 데이터가 없으면 `notFound()`(현재 적용됨)
- **랜드마크·h1:** h1 1개. `<main>`을 page가 직접 그림

#### `/musicbox` 뮤직박스

- **컨트롤러:** `SongsController`(공개) · `GET /api/v1/musicbox/songs`, `GET /api/v1/songs/now` · WBS 11.2~11.3. 보조 컨트롤러: `my/SongsController` 신청(WBS 11.1)
- **화면:** 현재 곡(DJ 부스, YouTube 재생, 사연 낭독), 재생 목록·접수 목록·재생 완료 목록, 신청 폼(회원만, 비회원은 로그인 안내)
- **URL 상태:** `page`(목록 페이지, 1부터, 10개 단위), `submitted`(flash)
- **로컬 상태:** 신청 폼 상태, 플레이어 음량·재생 상태. 서버 데이터 갱신은 `MusicBoxRefresher`가 변경을 감지해 `router.refresh()`로 한다.
- **클라이언트 분리:** `RequestForm`, `DjBooth`, `YouTubePlayer`, `VolumeControl`, `MusicBoxRefresher`
- **SEO:** 공개·색인. title `뮤직박스`, canonical `/musicbox`(`page`는 유지)
- **랜드마크·h1:** h1 1개. `<main>`을 page가 직접 그림

### 3-2. 고객 영역 `(customer)`

모두 고객 역할이 필요하다(`requireRole("customer")`). SEO는 모두 `noindex, nofollow`다. `<main>`은 `(customer)/layout.tsx`에 있다.

#### `/cart` 장바구니

- **컨트롤러:** `my/CartItemsController` · `GET /api/v1/cart/items`, `PUT`·`DELETE /api/v1/cart/items/{id}` · WBS 14.2~14.4
- **화면:** 담은 항목, 수량 변경(1~20), 삭제, 주문 대상 항목 체크·전체 체크, 주문 대상 합계, 주문하기
- **URL 상태:** 없음
- **현재 상태:** 장바구니 전체가 전역 Context + localStorage에 있음
- **목표 상태(5-2):** 항목은 서버 데이터, 주문 대상 체크만 클라이언트 로컬 상태
- **클라이언트 분리:** `CartView`(현재는 화면 전체)
- **SEO:** title `장바구니`
- **랜드마크·h1:** h1 1개

#### `/checkout` 주문서

- **컨트롤러:** `my/OrdersController` · `POST /api/v1/orders` · WBS 6.1
- **화면:**
  - 주문 대상 항목
  - 수령 방식(매장 식사·포장)
  - 요청사항(100자 이하)
  - 카운터 결제수단(카드·현금)
  - 주문 동의
  - 주문 접수
  - 중복 제출 방지: `submitting` ref + `useTransition`
  - 접수에 성공하면 `/my/orders/[id]?placed=1`로 replace
- **URL 상태:** 없음
- **로컬 상태:** 수령 방식, 결제수단, 요청사항, 동의, 오류, 제출 중. 전역 상태: 장바구니 Context(전환 대상)
- **클라이언트 분리:** `CheckoutView`(현재는 화면 전체)
- **SEO:** title `주문서`
- **랜드마크·h1:** h1 1개(`주문 / 결제`. 용어 갭, 8-1 참고)

#### `/my` 마이페이지

- **컨트롤러:** `my/UsersController` · `GET /api/v1/my` · WBS 1.5. 보조 컨트롤러: `AuthController` 로그아웃(WBS 1.2)
- **화면:** 단골 회원증(이름·이메일), 신청곡·장바구니·주문 목록 바로가기, 로그아웃
- **URL 상태:** 없음
- **로컬·전역 상태:** 없음
- **클라이언트 분리:** 없음
- **SEO:** title `마이페이지`
- **랜드마크·h1:** h1 1개

#### `/my/orders` 내 주문 목록

- **컨트롤러:** `my/OrdersController` · `GET /api/v1/orders` · WBS 6.3
- **화면:** 진행 중 주문과 지난 주문(완료·취소). 주문 코드, 일시, 상태, 요약, 총액, 관리자 취소 사유
- **URL 상태:** 없음
- **로컬·전역 상태:** 없음
- **클라이언트 분리:** 없음
- **SEO:** title `내 주문`
- **랜드마크·h1:** h1 1개

#### `/my/orders/[id]` 내 주문 상세

- **컨트롤러:** `my/OrdersController` · `GET /api/v1/orders/{id}` · WBS 6.4. 고객 취소(6.2)는 백엔드 보류
- **화면:** 주문 번호·일시·상태, 품목(옵션·수량·단가·합계), 수령 방식·카운터 결제수단·요청사항, 관리자 취소 사유, `received` 상태일 때 고객 취소
- **URL 상태:** params `id`. flash `placed`, `canceled`, `error=cancel`
- **로컬·전역 상태:** 없음
- **클라이언트 분리:** `CancelOrderForm`(확인 대화상자, 제출 중 표시)
- **SEO:** title `주문 {코드}`. 데이터가 없거나 본인 주문이 아니면 `notFound()`(현재 적용됨)
- **랜드마크·h1:** h1 1개

#### `/my/songs` 내 신청곡

- **컨트롤러:** `my/SongsController` · `GET /api/v1/my/songs`, `DELETE /api/v1/my/songs/{id}` · WBS 11.4~11.5
- **화면:** 현재 곡 DJ 부스, 내가 보낸 신청곡을 상태순으로 표시, 재생 중이 아닌 곡 삭제
- **URL 상태:** flash `deleted`, `error=delete`
- **로컬 상태:** 플레이어 상태
- **클라이언트 분리:** `DeleteRequestForm`. `DjBooth`, `MusicBoxRefresher`는 `(public)/musicbox/_components`에서 가져옴(8-1 갭)
- **SEO:** title `내 신청곡`
- **랜드마크·h1:** h1 1개

### 3-3. 관리자 영역 `admin`

모두 관리자 역할이 필요하다(`admin/layout.tsx`의 `requireRole("admin")`). SEO는 모두 `noindex, nofollow`다. `<main>`은 `admin/layout.tsx`에 있고, 사이드바 내비게이션은 `aria-current`를 쓴다.

#### `/admin` 관리자 인덱스

- **컨트롤러:** 없음(예외) · 관리자 Menus·Orders·Songs 목록 조합 · 근거: 설계 제안
- **화면:** 메뉴 현황(전체·판매 중·판매 중지), 처리할 주문 수, 대기 신청곡 수, 각 관리 화면 링크
- **URL 상태:** 없음
- **로컬·전역 상태:** 없음
- **클라이언트 분리:** 없음
- **SEO:** title `관리자`
- **랜드마크·h1:** h1 1개

#### `/admin/users` 회원 목록

- **컨트롤러:** `admin/UsersController` · `GET /api/v1/admin/users` · WBS 2.1
- **화면:** 검색, 상태·권한 필터, 정렬, 페이지 이동, 상세 보기, 정지·해제
- **URL 상태:**
  - `q`: 100자까지
  - `status`: `active` | `suspended`
  - `role`: `customer` | `admin`
  - `sort`: `name` | `email`. 기본 `name`
  - `page`: 1부터, 10개 단위
  - GET 폼으로 제출한다.
- **로컬 상태:** 필터 입력 중인 값(`UserFilters`). `key={query}`로 URL과 다시 맞춘다.
- **클라이언트 분리:** `UserFilters`, `UserStatusForm`, `UserStatusFeedback`
- **SEO:** title `회원 관리`(현재 metadata 있음)
- **랜드마크·h1:** h1 1개

#### `/admin/users/[id]` 회원 상세

- **컨트롤러:** `admin/UsersController` · `GET`·`PUT /api/v1/admin/users/{id}` · WBS 2.2~2.3
- **화면:** 회원 정보, 상태 변경(고객만. 관리자 계정은 보호), 목록 조건을 유지한 채 돌아가기
- **URL 상태:** params `id`. 목록 쿼리(`q`, `status`, `role`, `sort`, `page`)를 그대로 넘겨받음
- **로컬 상태:** 상태 변경 결과(`useActionState`)
- **클라이언트 분리:** `UserStatusForm`
- **SEO:** title `회원 상세`(현재 metadata 있음)
- **랜드마크·h1:** h1 1개

#### `/admin/categories` 카테고리 관리

- **컨트롤러:** `admin/CategoriesController` · `GET`·`POST /api/v1/admin/categories`, `PUT`·`DELETE /{id}`, `PUT /order` · WBS 13.1~13.4
- **화면:**
  - 등록, 이름 수정, 위·아래로 순서 이동, 전체 재배치, 삭제 확인
  - 삭제한 카테고리의 메뉴는 기타 카테고리로 옮긴다.
  - 기타 카테고리는 수정·삭제할 수 없다.
- **URL 상태:** 없음
- **로컬 상태:** 행 편집 여부, 폼 오류, 삭제 대화상자
- **클라이언트 분리:** `CategoryList`, `CategoryRow`, `CreateCategoryForm`, `DeleteCategoryDialog`
- **SEO:** title `카테고리 관리`
- **랜드마크·h1:** h1 1개

#### `/admin/menus` 메뉴 목록

- **컨트롤러:** `admin/MenusController` · `GET /api/v1/admin/menus`, `DELETE /api/v1/admin/menus/{id}` · WBS 3.3, 3.5
- **화면:**
  - 이미지, 한글·영문 메뉴명, NEW·추천 뱃지, 카테고리, 가격, 상태, 등록일, 수정·삭제
  - 메뉴명 검색, 카테고리·상태 필터, 정렬은 **검색 버튼으로 함께 적용**한다.
- **URL 상태:**
  - `q`: 100자까지
  - `category`: 현재는 이름. 백엔드 계약에 맞춰 `categoryId`로 바꿀 예정
  - `status`: `available` | `unavailable`
  - `sort`: `newest` | `oldest` | `name` | `price-low` | `price-high`. 기본 `newest`
  - flash: `created`, `deleted`, `missing`
  - 현재 페이지 이동이 없다. 백엔드는 `page`·`size`로 페이지를 나누므로 URL `page`(1부터)를 추가할 예정
- **로컬 상태:** 필터 선택(`MenuFilterSelect`)
- **클라이언트 분리:** `MenuFilterSelect`, `DeleteMenuButton`
- **SEO:** title `메뉴 관리`
- **랜드마크·h1:** h1 1개. `loading.tsx` 있음

#### `/admin/menus/new` 메뉴 등록

- **컨트롤러:** `admin/MenusController` · `POST /api/v1/admin/menus` · WBS 3.1
- **화면:** 등록·수정 공통 `MenuForm`. 메뉴명·영문명·이미지(URL 또는 파일)·카테고리·설명·가격·판매 상태·온도(핫·아이스)·첫 개시·추천. 필드 오류는 `aria-describedby`로 연결. 등록하면 `/admin/menus?created={id}`로 이동
- **URL 상태:** 없음
- **로컬 상태:** 폼 상태(`useActionState`)
- **클라이언트 분리:** `MenuForm`
- **SEO:** title `메뉴 등록`
- **랜드마크·h1:** h1 1개

#### `/admin/menus/[id]` 메뉴 상세

- **컨트롤러:** `admin/MenusController` · `GET`·`DELETE /api/v1/admin/menus/{id}` · WBS 3.4, 3.5
- **화면:** 메뉴 정보, 수정 링크, 삭제
- **URL 상태:** params `id`(현재 UUID. 백엔드는 Long). flash `updated`, `deleteError`
- **클라이언트 분리:** `DeleteMenuButton`
- **SEO:** title은 메뉴명
- **랜드마크·h1:** h1 1개

#### `/admin/menus/[id]/edit` 메뉴 수정

- **컨트롤러:** `admin/MenusController` · `GET`·`PUT /api/v1/admin/menus/{id}` · WBS 3.2
- **화면:** `MenuForm`을 수정 모드로 사용. 저장하면 `/admin/menus/{id}?updated=1`로 이동
- **URL 상태:** params `id`
- **클라이언트 분리:** `MenuForm`
- **SEO:** title `메뉴 수정`
- **랜드마크·h1:** h1 1개

#### `/admin/orders` 주문 목록

- **컨트롤러:** `admin/OrdersController` · `GET /api/v1/admin/orders`, `PUT /api/v1/admin/orders/status` · WBS 5.x/12.x
- **화면:** 처리할 주문·완료·취소 구역별 목록, 표·카드 보기 전환, 인접 상태로 변경, 취소 사유 입력, 명세표
- **URL 상태:**
  - `q`: 주문번호·고객명·메뉴명, 100자까지
  - `status`: 주문 상태 5종
  - `sort`: `newest` | `oldest`. 기본 `newest`
  - `view`: `list` | `grid`. 기본 `list`
  - `activePage`, `completedPage`, `canceledPage`: 구역별 페이지, 10개 단위
  - flash: `updated`, `error`, `focus`
  - 검색은 GET 폼으로 한다.
- **로컬 상태:** 구역 펼침(`OrderSectionAccordion`), 상태 선택·취소 사유(`StatusChangeForm`)
- **클라이언트 분리:** `OrderSectionAccordion`, `StatusChangeForm`
- **SEO:** title `주문 관리`
- **랜드마크·h1:** h1 1개. page가 226줄로 조립 외 로직을 포함(8-1 갭)

#### `/admin/orders/[id]` 주문 상세

- **컨트롤러:** `admin/OrdersController` · `GET /api/v1/admin/orders/{id}`, `PUT /api/v1/admin/orders/status` · WBS 5.x/12.x
- **화면:** 주문 정보, 품목, 상태 변경·취소, 취소 사유, 목록 조건을 유지한 채 돌아가기
- **URL 상태:** params `id`. 목록 쿼리를 그대로 넘겨받음. flash `updated`, `error`
- **클라이언트 분리:** `StatusChangeForm`
- **SEO:** title `주문 {코드}`
- **랜드마크·h1:** h1 1개

#### `/admin/songs` 뮤직박스 운영

- **컨트롤러:** `admin/SongsController` · 2-2의 8개 엔드포인트 · WBS 10.x
- **화면:**
  - 접수함: 사연 확인, YouTube 링크 붙이기·미리보기·길이 기록, 접수 취소
  - 재생 목록: 순서 이동, 지금 재생, 접수함으로 되돌리기
  - 현재 곡: 완료·취소
- **URL 상태:** 없음
- **로컬 상태:** 링크 입력·미리보기, 플레이어 상태
- **클라이언트 분리:** `RequestCard`, `AddToPlaylistForm`, `YouTubePreview`, `OnAirPlayer`, `CancelRequestForm`
- **SEO:** title `뮤직박스 운영`
- **랜드마크·h1:** h1 1개. page가 203줄

### 3-4. 공통 화면

#### `/forbidden` 권한 없음

- **컨트롤러:** 없음(예외)
- **화면:** 역할이 맞지 않을 때 보여 주는 안내와 시작 화면 링크
- **SEO:** `noindex`. title `접근 제한`
- **랜드마크·h1:** `<main>`을 page가 직접 그림. h1은 공통 `StatePanel` 안에 있음(5-4 갭). 루트의 `error.tsx`, `not-found.tsx`도 `StatePanel`을 쓴다.

---

## 4. 사용자 흐름

아래 4-1~4-3은 청사진 3장 원문이다. 원문의 "결제 수단"은 WBS 8.x 온라인 결제수단을 뜻하며, GLOSSARY의 **카운터 결제수단**과 다르다. 현재 코드의 흐름은 4-4에 따로 적는다.

### 4-1. 고객

1. 메뉴 목록에서 카테고리·검색·정렬로 탐색하고 상세에서 옵션과 수량을 고른다. 옵션 종류는 시트에 없어 **확정 전까지 선택적 필드**로 둔다.
2. 장바구니에서 품목·수량·예상 금액을 확인한다. 시트는 장바구니 제목만 적고 있으므로 저장 방식과 만료 정책은 추후 결정한다.
3. 결제 화면에서 주문 내역과 결제 수단을 확인하고 제출한다. 중복 제출 방지, 진행 중 상태, 성공·실패·재시도 경로를 제공한다.
4. 주문 상세에서 상태를 확인하고 허용된 상태에서만 취소한다.
5. 완료한 주문에서 리뷰를 작성하고, 내 리뷰에서 수정·삭제한다. 작성 가능 시점과 중복 작성 여부는 정책 확정이 필요하다.

### 4-2. 관리자

1. 공통 목록 패턴(검색, 상태 필터, 정렬, 페이지 이동)으로 회원·메뉴·주문·리뷰를 조회한다.
2. 메뉴 등록/수정은 동일한 폼을 재사용한다. 삭제와 상태 변경은 대상 및 결과를 확인한 뒤 처리한다.
3. 주문의 상태 변경은 현재 상태와 선택 가능한 다음 상태를 표시한다. 실제 전이 규칙은 제품 정책으로 정의한다.

### 4-3. 뮤직박스

방문자가 사연·신청곡·가수를 남기면 대기 목록에 접수된다. 관리자가 음원 주소 또는 파일을 연결하고 한 곡을 선곡하면 공개 화면에 현재 선곡과 오디오 플레이어가 나타난다. 재생 완료 후 관리자가 상태를 완료로 바꾼다. 실제 음원 공급과 사용 권한, 다중 사용자 재생 동기화는 별도 결정이 필요하다.

### 4-4. 현재 코드의 흐름 (2026-10-22)

- **주문:**
  1. `/menus` → `/menus/[slug]`에서 온도·수량을 고른다. 담으려면 로그인이 필요하다.
  2. `/cart`에서 주문 대상 항목을 체크한다.
  3. `/checkout`에서 수령 방식·요청사항·카운터 결제수단을 고르고 동의한다.
  4. 주문을 접수하면 `/my/orders/[id]?placed=1`로 이동한다.

  실제 결제는 없고 결제는 카운터에서 한다.
- **주문 처리:**
  - 관리자는 `/admin/orders`에서 인접 상태로만 옮긴다: `received ↔ preparing ↔ ready ↔ completed`.
  - 취소는 사유를 입력해야 하고, 결과는 `/my/orders/[id]`에 반영된다.
  - 고객은 `received` 상태에서 취소할 수 있다.
- **뮤직박스:**
  1. 회원이 `/musicbox`에서 신청하면 접수(`pending`) 상태가 된다.
  2. 관리자가 YouTube 링크를 붙여 재생 목록에 담는다(`queued`).
  3. 지금 재생하면 `playing`, 끝나면 `played`가 된다. 접수를 취소하면 `cancelled`다.
  4. 서버가 정한 시작 시각과 영상 길이로 모든 화면의 재생 위치와 다음 곡 전환을 맞춘다.
- **리뷰:** 흐름이 없다(미구현, 범위 밖).

---

## 5. 개발 규칙

FRONTEND_GUIDE.md(통합 후 삭제)를 실제 구조에 맞춰 옮긴 규칙이다. 새 코드와 기존 코드 정리 모두 이 규칙을 따른다.

### 5-0. 핵심 원칙

1. **라우트-컨트롤러 1:1.** 페이지 ↔ 주 컨트롤러 쌍이 작업 단위다(2장).
2. **코로케이션.** 코드는 그것을 쓰는 라우트 가까이에 둔다. 두 곳 이상에서 실제로 쓰일 때만 위로 올린다.
3. **시맨틱 마크업 + 웹 접근성.** 랜드마크와 헤딩 구조를 지키고, 키보드·스크린리더로 모든 기능을 쓸 수 있어야 한다.
4. **서버 컴포넌트의 상태는 URL.** 필터·정렬·페이지·탭·검색어의 단일 진실 공급원은 URL(`searchParams`, `params`)이다. page에서 읽어 자식에게 props로 내려준다.
5. **데이터·API는 백엔드 청사진, 용어는 GLOSSARY가 기준이다.**

### 5-1. 폴더 구조와 코로케이션

```text
frontend/
├─ proxy.ts                        라우트 1차 보호 (도입 예정, 5-7)
├─ next.config.ts                  /api/v1/* 백엔드 프록시 (도입 예정, 5-7)
├─ app/
│  ├─ layout.tsx                   html lang, 전역 metadata 기본값, 헤더·푸터
│  ├─ robots.ts, sitemap.ts        (도입 예정, 5-5)
│  ├─ error.tsx, loading.tsx, not-found.tsx, forbidden/
│  ├─ _components/                 모든 역할이 공유하는 UI (SiteHeader, SiteNav …)
│  │  └─ ui/                       도메인을 모르는 공통 UI (StatePanel, EmptyState …)
│  ├─ _lib/                        모든 역할이 공유하는 코드
│  │  ├─ api/                      백엔드 요청기·공통 응답 타입 (도입 예정)
│  │  ├─ session/                  세션 확인·로그아웃
│  │  ├─ mock/                     목 저장소 (API 전환이 끝나면 삭제)
│  │  └─ <도메인>/                 여러 역할이 쓰는 도메인 타입 (예: orders/types.ts)
│  ├─ api/                         Next 라우트 핸들러 (/api/v1 아님)
│  ├─ (public)/                    공개: 인덱스, login, signup, menus, musicbox
│  ├─ (customer)/                  고객: cart, checkout, my(orders, songs)
│  └─ admin/                       관리자: users, categories, menus, orders, songs
└─ public/                         공개 이미지·아이콘
```

`(public)`과 `(customer)`는 URL에 나타나지 않는 라우트 그룹이다. 예를 들어 `app/(customer)/my/orders/page.tsx`의 URL은 `/my/orders`다. `_` 접두사 폴더(`_components`, `_lib`, `_hooks`, `_actions`)는 라우팅에서 제외되는 private 폴더다. 최상위 `features/`, `components/`, `lib/`, `stores/`, `types/` 폴더는 만들지 않는다.

라우트 하나의 내부 구조는 다음과 같다.

```text
app/(public)/menus/
├─ page.tsx                        searchParams를 파싱하고 조립만 한다
├─ loading.tsx
├─ error.tsx                       'use client' 필수
├─ _components/                    이 라우트 전용 컴포넌트
│  ├─ MenuSearchForm.tsx
│  └─ MenuList.tsx
├─ _hooks/                         이 라우트 전용 훅
├─ _lib/                           이 라우트 전용 api·유틸·타입
│  ├─ api.ts
│  └─ searchParams.ts              URL 파싱·검증
├─ _actions.ts                     이 라우트의 Server Action (여러 개면 _actions/ 폴더)
└─ [slug]/
   ├─ page.tsx
   └─ _components/OrderPanel.tsx
```

**배치 단계**

| 사용하는 범위 | 배치 위치 | 예시 |
| --- | --- | --- |
| 한 화면 | 해당 `page.tsx` 옆 | 메뉴 상세 주문서 → `(public)/menus/[slug]/_components/OrderPanel.tsx` |
| 같은 기능의 여러 화면 | 기능 폴더 | 메뉴 등록·수정 폼 → `admin/menus/_components/MenuForm.tsx` |
| 같은 역할의 여러 기능 | 역할 폴더 | 공개 화면 둘이 쓰는 메뉴 카드 → `(public)/_components/` |
| 모든 역할 | `app/_components/`, `app/_lib/` | 헤더, 세션 확인, 백엔드 요청기 |

**규칙**

- 처음에는 반드시 라우트 안에 만든다. 두 번째 사용처가 생기면 그 둘의 가장 가까운 공통 부모로 올린다.
- 다른 라우트의 `_components`·`_lib`를 직접 import하지 않는다. 필요하면 위 표의 공통 위치로 올린다.
- `page.tsx`는 조립만 한다. 데이터 조회는 `_lib/api.ts`, UI 세부는 `_components`에 둔다.
- 변경 코드(Server Action)는 가까운 `_actions.ts`에 둔다. 파일이 여러 개로 나뉘면 `_actions/` 폴더를 쓴다.
- 라우트별로 `loading.tsx`, `error.tsx`, 필요하면 `not-found.tsx`를 둔다.
- 단위 테스트는 대상 파일 옆에 두고, 여러 화면을 잇는 시나리오 테스트는 `frontend/e2e/`에 둔다.

### 5-2. 상태 관리

| 상태 종류 | 위치 | 예시 |
| --- | --- | --- |
| 공유·북마크·뒤로 가기가 의미 있는 상태 | **URL** (`searchParams`, `params`) | 메뉴 검색어·카테고리·정렬, 관리자 목록 필터·페이지, 상세 id·slug |
| 서버 데이터 | **서버 컴포넌트에서 조회** | 메뉴 목록, 주문 상세, 장바구니 항목, 회원 정보 |
| 컴포넌트 안의 일시적 UI 상태 | 클라이언트 컴포넌트 `useState` | 입력 중인 값, 대화상자 열림, 온도·수량 선택, 주문 대상 체크 |
| 여러 클라이언트 컴포넌트가 공유하는 UI 상태 | 가까운 공통 부모의 React Context (최소화) | 현재 해당 없음 |

- 서버 데이터를 클라이언트 전역 상태로 복사하지 않는다.
- **장바구니도 서버 데이터다** (`my/CartItemsController`). 현재의 `CartContext` + localStorage는 장바구니 API를 연결하는 작업에서 걷어낸다. 주문 대상 체크(WBS 14.5)는 서버 API 없이 화면 로컬 상태로 둔다.
- TanStack Query와 Zustand는 도입하지 않는다. 클라이언트에서 자주 갱신해야 하는 데이터가 생기면 6장에 올려 결정한다.
- URL에 있는 값을 `useState`로 또 들고 있지 않는다. 단, 입력 중인 값은 로컬 상태로 두고 제출할 때 URL에 반영한다. 이때 컴포넌트에 `key`를 줘서 URL이 바뀌면 입력값을 다시 맞춘다.

**URL 파라미터 규칙**

- `searchParams`는 page에서만 받는다. page에서 한 번 파싱·검증하고, 필요한 값만 props로 넘긴다.
- 항상 파싱·기본값·유효성 검증을 거친 뒤 사용한다. 이상한 값이 들어와도 깨지지 않아야 한다.
- 기본값은 URL에서 생략한다. 예: `sort=newest`는 붙이지 않는다.
- 파라미터 이름은 백엔드 API 쿼리 이름과 맞춘다. 공개 메뉴는 `q`, `category`, `sort`, 관리자 메뉴는 `q`, `categoryId`, `status`, `sort`다.
- URL의 `page`는 1부터 센다. 백엔드의 `page`는 0부터 세므로 API를 호출할 때 `page - 1`로 바꾼다.
- 필터·정렬·검색어가 바뀌면 `page`는 제거해 1페이지로 돌린다.
- **검색·필터는 제출할 때 한꺼번에 적용한다.** 관리자 메뉴 목록의 "검색 버튼으로 함께 적용" 동작이 기준이다. 기본 구현은 서버 컴포넌트의 `<form method="get">`이며, 브라우저 동작상 push로 기록된다. 클라이언트 컴포넌트에서 URL을 바꿔야 하면 `router.replace`를 쓴다.
- 페이지 이동 성격(페이지네이션, 탭, 상세 이동)은 `Link`(push)를 쓴다.
- 변경 결과 안내(flash)는 일회성 쿼리 값(`?created=…`, `?updated=1`, `?error=…`)으로 전달하고, canonical에서는 제외한다.
- `useSearchParams`를 써야 하는 클라이언트 컴포넌트는 `<Suspense>`로 감싼다.
- props drilling이 3단계를 넘으면 구조를 다시 본다. page에서 조립하도록 평탄화하거나 children 패턴을 쓴다.

**예시: 공개 메뉴 목록**

```ts
// app/(public)/menus/_lib/searchParams.ts
export const MENU_SORTS = ["newest", "name", "price-low", "price-high"] as const;
export type MenuSort = (typeof MENU_SORTS)[number];

export type MenuQuery = { q: string; category: string; sort: MenuSort };
export type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function isMenuSort(value: string): value is MenuSort {
  return (MENU_SORTS as readonly string[]).includes(value);
}

export function parseMenuSearchParams(raw: RawSearchParams): MenuQuery {
  const sort = single(raw.sort);
  return {
    q: single(raw.q).trim().slice(0, 100),
    category: single(raw.category),
    sort: isMenuSort(sort) ? sort : "newest",
  };
}

export function menusHref({ q, category, sort }: MenuQuery): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (sort !== "newest") params.set("sort", sort);
  return params.size ? `/menus?${params}` : "/menus";
}
```

```tsx
// app/(public)/menus/page.tsx
import type { Metadata } from "next";
import { fetchMenuCategories, fetchMenus } from "./_lib/api";
import { parseMenuSearchParams, type RawSearchParams } from "./_lib/searchParams";
import { MenuList } from "./_components/MenuList";
import { MenuSearchForm } from "./_components/MenuSearchForm";

export const metadata: Metadata = {
  title: "메뉴",
  description: "삼다방의 차·커피·쥬스·다과·세트 메뉴",
  alternates: { canonical: "/menus" },
};

export default async function MenusPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseMenuSearchParams(await searchParams);
  const [menus, categories] = await Promise.all([fetchMenus(query), fetchMenuCategories()]);
  // 존재하지 않는 카테고리는 전체로 본다.
  const category = categories.some((item) => item.name === query.category) ? query.category : "";

  return (
    <>
      <h1>메뉴</h1>
      <MenuSearchForm q={query.q} category={category} sort={query.sort} />
      <MenuList menus={menus} />
    </>
  );
}
```

```tsx
// app/(public)/menus/_components/MenuSearchForm.tsx — 서버 컴포넌트, 제출할 때 URL에 반영
import type { MenuSort } from "../_lib/searchParams";

type Props = { q: string; category: string; sort: MenuSort };

export function MenuSearchForm({ q, category, sort }: Props) {
  return (
    <search>
      <form method="get" action="/menus">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="menu-query">메뉴 검색</label>
        <input id="menu-query" name="q" type="search" maxLength={100} defaultValue={q} />
        <label htmlFor="menu-sort">정렬</label>
        <select id="menu-sort" name="sort" defaultValue={sort}>
          <option value="newest">최근 등록순</option>
          <option value="name">메뉴명순</option>
          <option value="price-low">가격 낮은순</option>
          <option value="price-high">가격 높은순</option>
        </select>
        <button type="submit">검색</button>
      </form>
    </search>
  );
}
```

`defaultValue`를 쓰는 비제어 입력이라 URL이 바뀌면 서버가 새 값으로 다시 그린다. 클라이언트 컴포넌트로 같은 폼을 만들 때는 현재 값을 props로 받고(`useSearchParams`로 다시 읽지 않는다), 제출할 때 `router.replace(menusHref(next), { scroll: false })`를 호출한다.

### 5-3. 컴포넌트 설계

**분리하는 경우**

- **서버/클라이언트 경계:** 상호작용이 필요한 부분만 떼어 클라이언트 컴포넌트로 만든다. 가장 우선하는 기준이다.
- **독립된 책임:** 페이지의 한 영역(`section`, `article`, `aside`)이 자기 역할을 가질 때.
- **반복 단위:** 리스트 항목(`MenuCard` 등).
- **분기 덩어리:** 조건부 렌더링 블록이 길어 흐름을 읽기 어려울 때.
- **신호:** 파일이 200줄을 넘거나 JSX 안에 주석으로 영역을 나누고 있으면 분리를 검토한다.

**분리하지 않는 경우**

- 한 곳에서만 쓰는 몇 줄짜리 마크업을 쪼개기만 하는 경우
- props를 그대로 전달만 하는 래퍼 컴포넌트
- "나중에 재사용할 것 같아서" 미리 추상화하는 경우

**공통 UI와 라우트 컴포넌트**

| 구분 | 위치 | 알아도 되는 것 | 금지 |
| --- | --- | --- | --- |
| 공통 UI | `app/_components/ui/` | props만 | API 호출, 도메인 타입 import, URL 접근 |
| 공유 컴포넌트 | `app/_components/`, `(역할)/_components/` | 도메인 타입, 공통 `_lib` | 특정 라우트의 `_components`·`_lib` import |
| 라우트 컴포넌트 | `app/**/_components/` | 도메인 타입, 그 라우트의 `_lib` | 다른 라우트의 `_components` import |

- 공통 UI는 도메인을 모른다. `MenuButton`이 아니라 `Button`이다.
- 공통 UI는 접근성을 기본으로 내장한다. 예: `Button`의 기본 `type="button"`, 대화상자의 포커스 가두기·Esc·포커스 복귀, `Input`의 label 연결.
- 공통 UI는 네이티브 속성을 그대로 받는다(`ComponentProps<"button">` 확장, `...rest` 전달).

**서버/클라이언트 경계**

- 기본은 서버 컴포넌트다. `"use client"`는 상태·이벤트·브라우저 API가 필요한 leaf 컴포넌트에만 붙인다.
- page, layout에는 `"use client"`를 붙이지 않는다. 예외는 `error.tsx`다.
- 클라이언트 컴포넌트 안에 서버 컴포넌트가 필요하면 children으로 넘긴다.
- 서버에서 클라이언트로 넘기는 props는 직렬화 가능한 값만 쓴다. Server Action은 넘길 수 있지만, 일반 함수와 class 인스턴스는 넘길 수 없다.
- `window`, `localStorage`는 `useEffect` 안에서만 접근한다.
- 시크릿이나 서버 전용 로직이 있는 파일에는 `import "server-only"`를 쓴다. 예: `app/_lib/api/`, `app/_lib/session/`

**로직 분리**

- 클라이언트 컴포넌트의 상태·이펙트 로직이 길어지면 `_hooks/use<Name>.ts`로 분리한다.
- 순수 계산·포맷 함수는 `_lib/`로 분리한다. 예: [registeredDate.ts](../frontend/app/admin/menus/_lib/registeredDate.ts)
- 컴포넌트는 "무엇을 그리는지"만 보이게 유지한다.

**네이밍과 파일**

- 컴포넌트 파일명은 컴포넌트명과 같은 PascalCase다(`MenuCard.tsx`). 훅은 `use` 접두사 camelCase다(`useGoBack.ts`).
- 파일 하나에 export 컴포넌트 하나. 내부 전용 소형 컴포넌트는 같은 파일에 둬도 된다.
- named export를 쓴다. page, layout, loading, error, not-found, route 같은 Next 규약 파일만 default export다.
- props 타입은 파일 안에서 `Props`로 선언한다. 이벤트 핸들러 props는 `onXxx`, 내부 함수는 `handleXxx`로 짓는다.
- `index.ts` 배럴 파일은 만들지 않는다.

### 5-4. 마크업과 웹 접근성

**랜드마크**

```tsx
// app/layout.tsx (본문 바로가기는 모든 화면 공통)
<body>
  <a href="#main-content" className="skip-link">본문 바로가기</a>
  <SiteHeader />          {/* <header> + <nav aria-label="주 메뉴"> */}
  {children}
  <SiteFooter />
</body>

// app/(public)/layout.tsx, app/(customer)/layout.tsx, app/admin/layout.tsx
<main id="main-content" tabIndex={-1} className="container page-content">{children}</main>
```

- `header`, `nav`, `main`, `aside`, `footer`를 의미에 맞게 쓴다. `div`로 대체하지 않는다.
- `<main>`은 페이지당 하나다. **라우트 그룹 layout에 두고 page 안에서 다시 쓰지 않는다.** 그룹 layout이 없는 `forbidden/`, 루트의 `error.tsx`·`not-found.tsx`·`loading.tsx`는 직접 `<main>`을 둔다.
- `nav`가 둘 이상이면 `aria-label`로 구분한다. 예: `주 메뉴`, 관리자 사이드바, `현재 위치`(breadcrumb), `페이지네이션`
- 독립 콘텐츠 묶음은 `section` + 제목, 주문 카드처럼 단독 의미가 있으면 `article`을 쓴다.
- 검색 폼은 `<search>` 또는 `role="search"`를 쓴다.
- 본문 바로가기(skip link)는 평소 숨기고 포커스를 받으면 보이게 한다.

**헤딩**

- 페이지마다 `h1`은 하나이고, 제목은 `page.tsx`에서 쓴다. 클라이언트 폼이나 공통 UI 안에 `h1`을 두지 않는다.
- `h1 → h2 → h3` 순서로 쓰고 단계를 건너뛰지 않는다. 크기는 CSS로 조절한다.
- 시각적 제목이 없는 영역도 필요하면 `sr-only` 제목을 둔다.

**인터랙티브 요소**

- 동작은 `<button>`, 이동은 `<a>`(`next/link`)를 쓴다. `div onClick`은 금지한다.
- 버튼에는 `type`(`button`/`submit`)을 명시한다.
- 아이콘만 있는 버튼은 `aria-label`이 필수다(예: 카테고리 ▲▼ 버튼).
- 토글은 `aria-pressed`, 펼침 요소는 `aria-expanded` + `aria-controls`, 라디오형 선택은 `role="radio"` + `aria-checked`를 쓴다.
- 현재 페이지 메뉴는 `aria-current="page"`로 표시한다.

**폼**

- 모든 입력에 화면에 보이는 `<label>`을 연결한다(`htmlFor` 또는 감싸기). placeholder로 라벨을 대신하지 않는다.
- 관련 입력 묶음은 `fieldset` + `legend`로 묶는다(예: 주문서의 수령 방식, 카운터 결제수단).
- 오류 메시지는 `aria-describedby`로 입력과 연결하고 `aria-invalid="true"`를 표시한다.
- 제출에 실패하면 첫 번째 오류 필드로 포커스를 옮긴다.
- 필수 항목은 `required`와 시각적 표시를 함께 둔다.

**이미지·미디어**

- 의미 있는 이미지는 내용을 설명하는 `alt`를 쓰고, 장식용 이미지는 `alt=""`로 둔다.
- "이미지", "사진"으로 alt를 시작하지 않는다(예: `쌍화차 이미지` 대신 `쌍화차`).

**키보드와 포커스**

- Tab만으로 모든 기능을 쓸 수 있어야 한다. `:focus-visible` 스타일을 유지한다.
- 대화상자는 네이티브 `<dialog>` + `showModal()`을 쓴다. 포커스 가두기와 Esc를 기본으로 제공한다(예: [CartAddedDialog.tsx](../frontend/app/(public)/menus/[slug]/_components/CartAddedDialog.tsx)). 닫힌 뒤에는 트리거로 포커스를 돌려준다.
- `tabIndex`는 `0`, `-1`만 쓴다.

**동적 콘텐츠**

- 저장 완료, flash 안내, 검색 결과 수는 `role="status"`(`aria-live="polite"`)로 알린다. 오류는 `role="alert"`로 알린다. live region은 미리 DOM에 있어야 한다.
- 로딩 중인 영역에는 `aria-busy="true"`를 둔다.
- URL 필터 변경으로 목록이 바뀌면 결과 수를 live region으로 안내한다.

**문서 기본**

- `<html lang="ko">`(현재 적용됨)
- 페이지마다 고유한 `title`(5-5)

### 5-5. SEO

**루트 metadata 기본값**

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: { default: "삼다방", template: "%s | 삼다방" },
  description: "그 시절 다방의 온기를 담은 삼다방",
  openGraph: { type: "website", siteName: "삼다방", locale: "ko_KR", images: ["/og.png"] },
};
```

- `metadataBase`가 있어야 OG 이미지와 canonical의 상대 경로가 절대 URL이 된다. 사이트 도메인과 OG 이미지는 6장에서 정한다.
- `title.template`이 있으므로 page에서는 `title: "메뉴"`만 쓴다. `"회원가입 | 삼다방"`처럼 서비스명을 직접 붙이지 않는다.
- page에서 `openGraph`를 쓰면 루트의 `openGraph`를 통째로 덮어쓴다. 필요한 필드는 page에서 다시 채운다.

**색인 범위**

| 구분 | 페이지 | 처리 |
| --- | --- | --- |
| 공개·색인 | `/`, `/menus`, `/menus/[slug]`, `/musicbox` | 고유한 title·description, canonical, sitemap 포함 |
| 공개·비색인 | `/login`, `/signup`, `/forbidden` | `robots: { index: false }` |
| 로그인 필요 | `(customer)` 전체, `admin` 전체 | 그룹 layout의 metadata에 `robots: { index: false, follow: false }` |

로그인이 필요한 페이지는 robots.txt의 disallow 대신 noindex로 처리한다. disallow하면 크롤러가 noindex 태그를 읽지 못한다.

**canonical**

- 목록: 필터·정렬·검색어·flash는 제외하고 페이지 번호는 유지한다. 예: `/menus?category=차&sort=name`의 canonical은 `/menus`, `/musicbox?page=2&submitted=1`의 canonical은 `/musicbox?page=2`다.
- 상세: 자기 경로를 쓴다(`/menus/{slug}`).

**상세 metadata**

```tsx
// app/(public)/menus/[slug]/page.tsx
import { cache } from "react";
import { notFound } from "next/navigation";
import { fetchMenu } from "../_lib/api";

const getMenu = cache(fetchMenu); // page와 metadata에서 한 번만 호출

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) return {};
  return {
    title: menu.name,
    description: menu.description,
    alternates: { canonical: `/menus/${slug}` },
    openGraph: { title: menu.name, description: menu.description, images: [menu.imageUrl] },
  };
}

export default async function MenuDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound(); // 빈 화면에 200을 반환하지 않는다
  // ...
}
```

**크롤링 가능한 마크업**

- 핵심 콘텐츠(메뉴 목록·상세)는 서버에서 렌더해 초기 HTML에 포함한다.
- 페이지 이동은 `next/link`(실제 `<a href>`)로 한다. `onClick` + `router.push`로만 이동하는 링크를 만들지 않는다.
- 페이지네이션도 링크로 구현한다(`<Link href="?page=2">`).

**robots.txt / sitemap.xml**

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, sitemap: `${base}/sitemap.xml` };
}

// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  const menus = await fetchMenus({ q: "", category: "", sort: "newest" });
  return [
    { url: base },
    { url: `${base}/menus` },
    { url: `${base}/musicbox` },
    ...menus.map((menu) => ({ url: `${base}/menus/${menu.slug}`, lastModified: menu.updatedAt })),
  ];
}
```

- sitemap에는 공개·색인 페이지만 넣는다. 필터·정렬이 붙은 URL은 넣지 않는다.
- 배포 후 구글 서치 콘솔과 네이버 서치어드바이저에 사이트를 등록하고 sitemap을 제출한다. 카카오톡·슬랙에 링크를 붙여 OG 미리보기를 확인한다.
- 선택 사항: 구조화 데이터(JSON-LD), 상세별 `opengraph-image.tsx`

### 5-6. 데이터 조회, Server Actions, API

**API 규약**

- 엔드포인트, 요청·응답 형식, DTO 필드명, 오류 응답, 페이지네이션은 [백엔드 청사진](../backend/docs/2026-10-20-backend-blueprint.md)과 백엔드 DTO 코드가 기준이다. API 함수나 타입을 만들기 전에 먼저 확인한다.
- 프론트 타입은 DTO와 필드명·타입을 맞춘다. 프론트에서 임의로 이름을 바꾸지 않는다. 예:
  - 메뉴 id는 `number`(Long)다.
  - 온도는 `supportsHot`·`supportsIced`와 장바구니 `iced`를 쓴다.
  - 카테고리는 `categoryId`·`categoryName`이다.
- 오류 응답은 `{ code: string; message: string }`(`ErrorResponse`)이다. 예: `VALIDATION_ERROR`(400), `INVALID_REQUEST`(400), `NOT_FOUND`(404), `CONFLICT`(409)
- 금액은 원 단위 정수, 시각은 ISO 8601 문자열이다.
- 백엔드 청사진에 없는 API는 가정해서 구현하지 않는다. 백엔드와 합의해 청사진에 먼저 반영한다.

**조회 규칙**

- 서버 데이터는 **서버 컴포넌트에서 조회**한다. 라우트 전용 API 함수는 `_lib/api.ts`, 공통 요청기는 `app/_lib/api/`에 둔다. 컴포넌트에서 `fetch`를 직접 호출하지 않는다.
- 응답은 데이터 경계(`_lib/api.ts`)에서 검증하고, 화면에는 정규화된 타입만 넘긴다.

```ts
// app/_lib/api/client.ts
import "server-only";
import { cookies } from "next/headers";

export type ApiError = { code: string; message: string };

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly error: ApiError) {
    super(error.message);
  }
}

// 서버 간 호출이라 쿠키를 직접 실어 보낸다. 브라우저 호출은 /api/v1 프록시를 탄다(5-7).
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

```ts
// app/admin/menus/_lib/api.ts
import { apiFetch } from "@/app/_lib/api/client";

export type MenuResponse = {
  id: number; slug: string; name: string; description: string; imageUrl: string; price: number;
  categoryId: number; categoryName: string; available: boolean; isNew: boolean; recommended: boolean;
  supportsHot: boolean; supportsIced: boolean; createdAt: string; updatedAt: string;
};
export type MenuPageResponse = { items: MenuResponse[]; page: number; size: number; totalElements: number; totalPages: number };

export function fetchAdminMenus(query: { q: string; categoryId: number | null; status: string; sort: string; page: number }) {
  const params = new URLSearchParams({ sort: query.sort, page: String(query.page - 1) }); // URL은 1부터, API는 0부터
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.status) params.set("status", query.status);
  return apiFetch<MenuPageResponse>(`/api/v1/admin/menus?${params}`);
}
```

**변경 규칙**

- 변경은 **Server Action**으로 한다. 가까운 `_actions.ts`에 두고, 첫 줄에서 권한을 확인한다.
- 변경 후 갱신 방법은 **`revalidatePath`로 통일**한다. 변경 결과를 보여 줄 모든 경로를 갱신한다. 예: 주문 상태를 바꾸면 `/admin/orders`, `/admin/orders/[id]`, `/my/orders`, `/my/orders/[id]`
- 성공하면 `redirect`와 flash 쿼리로 결과를 알린다. 필드 오류는 `useActionState`로 폼에 돌려준다.

```ts
// app/admin/menus/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/app/_lib/api/client";
import { requireRole } from "@/app/_lib/session/session";
import type { MenuResponse } from "./_lib/api";
import { toMenuCreateRequest, type MenuFormState } from "./_lib/menuForm";

export async function createMenu(_previous: MenuFormState, formData: FormData): Promise<MenuFormState> {
  await requireRole("admin", "/admin/menus/new");
  let created: MenuResponse;
  try {
    created = await apiFetch<MenuResponse>("/api/v1/admin/menus", {
      method: "POST",
      body: JSON.stringify(toMenuCreateRequest(formData)),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { message: error.error.message };
    throw error;
  }
  revalidatePath("/admin/menus");
  revalidatePath("/menus");
  redirect(`/admin/menus?created=${created.id}`);
}
```

**목 저장소에서 API로 전환**

- 전환은 페이지-컨트롤러 쌍 단위로 한다(8장). 백엔드 엔드포인트가 생긴 쌍부터 해당 화면의 `mock*Repository` 호출을 `_lib/api.ts`로 바꾼다.
- 목 데이터는 이관하지 않는다(백엔드 청사진). 모든 쌍을 전환하면 `app/_lib/mock/`을 삭제한다.

### 5-7. 인증과 백엔드 연동

**목표 규칙** (백엔드 인증 API를 연결할 때 적용. 그 전까지는 1-3의 목 인증을 유지)

- 인증 정보는 httpOnly 쿠키에 둔다. localStorage에 저장하지 않는다.
- 브라우저에서 백엔드로 가는 호출은 Next `rewrites`로 프록시한다. **대상은 `/api/v1/:path*`로 한정**한다. `/api/*` 전체를 넘기면 `/api/music-box/version`, `/api/story-speech` 라우트 핸들러가 가려진다. destination은 환경변수로 관리한다.

  ```ts
  // next.config.ts
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.API_ORIGIN}/api/v1/:path*` }];
  },
  ```

- 프록시를 쓰지 않으면 `localhost:3000`과 `localhost:8080`처럼 포트만 달라도 CORS 대상이다. 이때는 `credentials: "include"`, 백엔드 `allowCredentials`, 정확한 origin 지정이 필요하다.
- 서버 컴포넌트와 Server Action에서 백엔드를 호출할 때는 `cookies()`로 꺼내 헤더에 직접 붙인다(5-6의 `apiFetch`).
- 라우트 보호는 `proxy.ts`에서 1차로 한다. 대상은 `/cart`, `/checkout`, `/my/*`, `/admin/*`이다. 최종 권한 검증은 백엔드가 한다.
- 화면에서 버튼을 숨기는 것과 별개로, 데이터를 가져오거나 바꾸는 경계(page, Server Action, 백엔드)에서 권한을 다시 확인한다. 현재 `requireRole`이 이 역할을 하며, `proxy.ts`를 도입한 뒤에도 Server Action의 권한 확인은 유지한다.

### 5-8. 기타

- 이미지는 `next/image` + `width`·`height` 또는 `fill` + `sizes`를 쓴다.
- 폰트는 `next/font`를 쓴다(현재 `next/font/local` 사용).
- 무거운 라이브러리는 `dynamic import`로 불러온다.
- 순서가 바뀌거나 추가·삭제되는 리스트의 `key`에 index를 쓰지 않는다.
- 브라우저에 노출하는 환경변수는 `NEXT_PUBLIC_`만 쓴다. `.env.local.example`을 커밋한다.
- `any`는 금지한다. URL 파라미터를 포함한 외부 입력은 검증한 뒤 쓴다.
- 금액은 원 단위 정수로 다루고 표시할 때만 포맷한다(`Intl.NumberFormat("ko-KR")`).
- 화면 문구와 문서는 GLOSSARY 용어를 쓴다.
  - 기타 카테고리("기본 카테고리"·"시스템 카테고리" 아님)
  - 주문 대상 항목("선택된 메뉴" 아님)
  - 카운터 결제수단("결제 상태" 아님. 실제 결제 완료를 뜻하지 않음)

### 5-9. 기존 코드 정리 순서

1. **구조:** 다른 라우트의 `_components`를 가져다 쓰는 코드를 공통 위치로 올린다.
2. **컴포넌트:** 화면 전체가 클라이언트인 곳(`CartView`, `CheckoutView`)과 200줄이 넘는 page를 나눈다.
3. **상태:** 장바구니 Context + localStorage를 서버 데이터로 바꾼다(장바구니 API 연결과 함께).
4. **마크업:** 본문 바로가기를 추가하고 `(public)`의 `<main>`을 layout으로 옮긴다. h1을 page로 옮긴다.
5. **접근성:** `router.push`로만 하는 이동을 `Link`로 바꾸고, 폼 label을 점검한다.
6. **SEO:** 루트 metadata 기본값, 페이지별 title·description·canonical, noindex, `robots.ts`, `sitemap.ts`를 추가한다.
7. **마무리:** 라우트별 `loading.tsx`, `error.tsx`, `not-found.tsx`를 둔다.

---

## 6. 확정이 필요한 항목

### 6-1. 청사진의 확정 필요 항목

청사진 7장의 9개 항목이다. 코드나 백엔드 청사진에 이미 들어간 내용은 "현재 상태"에 적었지만, 팀 확정 전까지 항목 자체는 남긴다.

| 우선도 | 항목 | 이유 | 현재 상태 |
| --- | --- | --- | --- |
| 높음 | 주문·결제의 상태와 취소 가능 조건 | 화면 행동과 전이 제어에 직접 영향 | 주문 상태는 코드와 백엔드 모두 `received`·`preparing`·`ready`·`completed`·`canceled`이고 한 단계씩 이동. 관리자 취소는 백엔드가 `received`만, 코드는 `received`·`preparing` 허용. 고객 취소는 코드에 있고 백엔드는 보류(Q2) |
| 높음 | 결제 제공자, 결제수단 저장·수정 방식 | 결제 화면 및 민감 정보 처리 방식 결정 | 실제 결제 없음. 카운터 결제수단(`card`/`cash`)만 저장. 온라인 결제는 백엔드 보류(Q1) |
| 높음 | 역할별 가입·로그인 방식 | 접근 경로와 권한 범위 결정 | 목 기준: 가입은 고객만, 이메일·비밀번호 로그인, 역할별 착지. 관리자 생성은 백엔드 계획(`/admin/users/new`) |
| 높음 | 뮤직박스 신청 권한·사연 공개 범위·대기 순서 | 접수 정책과 개인정보 표시 방식 결정 | 코드: 회원만 신청, 신청자 이름 공개, 곡명 1~100자·가수 1~80자·사연 1~500자, 재생 목록 순서는 관리자가 정함. 공개 동의는 없음 |
| 높음 | 뮤직박스 음원 출처·사용 권한·재생 동기화 방식 | 실제 곡 재생과 다중 사용자 경험 결정 | 코드: YouTube 영상 ID, 서버의 시작 시각·영상 길이로 동기화. 사용 권한은 미정 |
| 높음 | 장바구니 세부 요구사항 | 시트에는 `15.0 장바구니` 제목만 있음 | 코드: localStorage, 메뉴·온도별 한 줄, 수량 1~20, 담으려면 로그인 필요. 백엔드: 서버 저장, 주문 대상 체크는 화면 상태 |
| 중간 | 메뉴 카테고리·옵션·품절 정책 | 목록 필터와 상세·주문 폼 결정 | 코드: 관리자가 카테고리를 관리하고 기타 카테고리는 보호, 메뉴당 카테고리 여러 개, 온도 `hot`/`ice`, 품절은 `available=false`. 백엔드: 카테고리 하나, `supportsHot`/`supportsIced`, 숨김 삭제 |
| 중간 | 리뷰 작성 조건·평점·이미지, 관리자 리뷰 `등록` 의미 | 13.x와 14.x의 화면 및 권한 결정 | 최신 WBS·백엔드 범위 밖. 미구현 |
| 중간 | 관리자 결제 관리 범위 | 시트 39~41행에 제목과 번호만 있음 | 백엔드: 9.x에 세부 작업 없음 |

위 항목이 정해지기 전에는 화면과 타입에 임의 정책을 고정하지 않는다.

### 6-2. 이번 통합에서 보류한 항목

| 항목 | 이유 | 결정 주체 |
| --- | --- | --- |
| 백엔드 인증 방식(세션 쿠키 또는 토큰, CSRF, 쿠키 이름) | 5-7의 목표 규칙을 구체화하려면 필요. 백엔드 청사진도 "인증 구현 시 정한다"고만 함 | 백엔드 |
| 사이트 도메인(`NEXT_PUBLIC_SITE_URL`), OG 이미지, 백엔드 주소 환경변수 이름(예시는 `API_ORIGIN`) | SEO 기본값과 프록시 설정에 필요 | 팀 |
| 메뉴 `nameEn` 유지 여부, 메뉴 카테고리 하나/여러 개 | 프론트 화면은 영문명·여러 카테고리를 쓰고 백엔드 DTO에는 없음 | 백엔드와 협의 |
| 공개 메뉴 API `category` 값이 이름인지 id인지 | URL 파라미터 형식 결정 | 백엔드 |
| `/checkout`의 주문 대상 항목 조회 방법 | 장바구니가 서버로 가면 주문서도 `my/CartItemsController` 조회가 필요. 2-3 예외로 인정할지 결정 | 백엔드와 협의 |
| `/my/songs`의 현재 곡 표시 | 현재 곡은 공개 `SongsController`에 있음. 예외로 둘지, `my/SongsController` 응답에 포함할지 | 백엔드와 협의 |
| 관리자 메뉴 화면의 카테고리 선택 목록 API | `GET /api/v1/admin/categories`를 보조 컨트롤러로 둘지, 메뉴 API가 제공할지 | 백엔드와 협의 |
| 관리자 주문 취소 API 계약 | 백엔드 청사진에 주소 없음 | 백엔드 |
| 고객 주문 취소(6.2) 화면 유지 여부 | 코드에는 있으나 백엔드 보류(Q2) | 팀 |
| 뮤직박스 변경 감지(`/api/music-box/version`) 대체 방법 | 백엔드 `music_box_state.revision`·`serverNow` 응답으로 대체할지 | 백엔드와 협의 |
| GLOSSARY에 없는 용어 | 고객·회원·방문자, 사용자·관리자 인덱스, 주문 상태 라벨(접수·준비 중·준비 완료·완료·취소), 뮤직박스 상태 라벨 | GLOSSARY 관리자 |

---

## 7. 진행 현황

2026-10-22 코드 검증 결과다. 개발 순서와 단계 구성은 청사진 8장을 따른다.

- `[x]` 구현됨
- `[ ]` 부분 구현, 미구현, 또는 코드로 확인할 수 없음 (항목 끝에 표시)

**개발 순서:** 관리자 메뉴 목록·등록 → 고객 메뉴 조회 → 장바구니·주문 → 결제 → 주문 처리 → 뮤직박스 → 리뷰. 회원 관리와 품질 점검은 이 흐름을 완성한 뒤 진행한다. 각 단계에서 화면·상태·데이터 흐름까지 연결하고, 데이터 계약이 미확정이면 목 데이터로 검증한다.

**공통 상태:** 1~8단계의 구현은 모두 목 저장소·목 인증 기준이다. 백엔드 API 연결은 8장의 쌍 단위 작업으로 따로 추적한다.

### 선행 준비

- [x] Next.js App Router와 TypeScript `strict` 설정으로 프로젝트를 구성한다.
- [x] 공개·고객·관리자 레이아웃과 공통 UI, 로딩·빈 상태·오류 화면의 기본 형태를 만든다.
- [x] 로그인·회원가입·로그아웃과 역할별 접근 제어를 로컬 목 인증으로 준비한다. (WBS 1.1~1.3)
- [x] 화면 계약과 등록·수정 결과를 목록에 반영할 수 있는 목 데이터 어댑터를 준비한다.

### 1단계. 관리자가 메뉴 목록에서 등록

- [x] 관리자 인덱스 페이지(`/admin`)를 만들고 메뉴 목록으로 이동하는 진입점을 배치한다.
- [x] 관리자 메뉴 목록(`/admin/menus`)을 만들고 `메뉴 등록` 버튼을 배치한다. (WBS 3.3)
- [x] 목록의 버튼에서 메뉴 등록 폼(`/admin/menus/new`)으로 이동하고 입력 검증을 구현한다. (WBS 3.1)
- [x] 등록 후 목록으로 돌아가 새 메뉴를 확인하고, 목록에서 상세로 이동한다. (WBS 3.4)
- [x] 목록·상세에서 수정·삭제로 이어지는 동선을 만들고 등록·수정 폼을 공유한다. (WBS 3.2, 3.5)
- [x] 인덱스 → 목록 → 등록 → 목록·상세 → 수정·삭제 흐름을 점검한다.

관리자 메뉴의 실제 프론트 타입은 `id`(UUID), `name`, `nameEn`, `imageUrl`, `description`, `categories`(여러 개), `price`, `available`, `isNew`, `recommended`, `temperatures`(`hot`/`ice`), `createdAt`, `updatedAt`이다 ([menus.ts](../frontend/app/_lib/mock/menus.ts)). 카테고리는 `/admin/categories`에서 관리하며 기본값은 커피·차·쥬스·다과·세트·기타다. 백엔드 DTO와 다른 점은 5-6과 6-2를 참고한다. 목록은 검색 영역에서 메뉴명, 카테고리·상태 필터, 정렬을 선택한 뒤 검색 버튼으로 함께 적용한다.

### 2단계. 고객이 메뉴 조회

- [x] 사용자 인덱스 페이지(`/`)를 만들고 메뉴 조회·로그인·회원가입으로 이동하는 진입점을 배치한다.
- [x] 고객 메뉴 목록과 상세 화면을 만든다. (WBS 4.1~4.2)
- [x] 검색·카테고리 필터·정렬과 결과 없음·품절 상태를 처리한다. 세부 정책은 확정 후 반영한다.
- [x] 1단계에서 등록한 메뉴가 고객 화면에 표시되는지 점검한다.

### 3단계. 고객이 장바구니에 담고 주문

- [x] 메뉴 상세에서 수량·옵션을 선택해 장바구니에 담는다. (WBS 14.1) 근거: [OrderPanel.tsx](../frontend/app/(public)/menus/[slug]/_components/OrderPanel.tsx)
- [x] 장바구니에서 수량 변경·항목 삭제·예상 금액 확인을 구현한다. (WBS 14.2~14.4) 근거: [CartView.tsx](../frontend/app/(customer)/cart/_components/CartView.tsx)
- [x] 장바구니 내용을 확인하고 주문을 등록한다. 중복 제출을 막는다. (WBS 6.1) 근거: [CheckoutView.tsx](../frontend/app/(customer)/checkout/_components/CheckoutView.tsx)
- [x] 주문 목록·상세에서 등록된 주문과 품목·금액·상태를 확인한다. (WBS 6.3~6.4) 근거: [my/orders/](../frontend/app/(customer)/my/orders/)

### 4단계. 고객이 결제 (백엔드 보류 Q1)

- [ ] 결제 화면에서 주문 내역·최종 금액·결제수단을 확인한다. (WBS 7.1, 8.2) **부분:** 내역·금액·카운터 결제수단 선택은 있음. 남은 작업: 온라인 결제수단 연동
- [ ] 결제수단 조회·등록·수정·삭제 화면을 만들고 결제 화면과 프로필에서 폼을 공유한다. (WBS 8.1~8.4) **미구현**
- [ ] 결제 제출·완료·실패·재시도 화면을 만들고 중복 결제를 방지한다. (WBS 7.1) **부분:** 주문 접수 실패 메시지와 중복 제출 방지는 있음. 남은 작업: 실제 결제와 완료·재시도 화면
- [ ] 결제 취소 흐름을 만든다. 허용 조건과 결제 제공자 방식이 확정된 뒤 연결한다. (WBS 7.2) **미구현**

### 5단계. 관리자가 주문 처리하고 고객이 상태 확인

- [x] 관리자 인덱스에서 주문 목록으로 이동하고, 목록에서 주문 상세를 연다. (WBS 5.2~5.3) 근거: [admin/orders/](../frontend/app/admin/orders/)
- [x] 주문 상세에서 상태 변경·취소를 수행하고, 결과를 목록·상세에 반영한다. (WBS 5.1, 5.4) 근거: [admin/orders/_actions.ts](../frontend/app/admin/orders/_actions.ts)
- [x] 고객 주문 상세에 갱신된 상태와 허용된 경우의 주문 취소 동작을 반영한다. (WBS 6.2) 근거: [my/orders/_actions.ts](../frontend/app/(customer)/my/orders/_actions.ts). 백엔드는 6.2 보류
- [ ] 결제된 주문 → 관리자 처리 → 고객 상태 확인 흐름을 점검한다. **코드로 확인 불가**

### 6단계. 뮤직박스 사연 접수와 선곡

진행 순서: **운영 정책 확정 → 데이터·음원 계약 → 고객 접수 → 관리자 선곡 → 재생·상태 처리 → 실제 음원으로 검증.**

현재 `/musicbox`, `/my/songs`, `/admin/songs`가 목 저장소로 동작한다. 음원은 관리자가 붙인 YouTube 링크이고, 재생 위치는 서버의 시작 시각·영상 길이로 맞춘다. 6-1·6-2의 정책 중 코드로 정해지지 않은 부분과 6-6 검증이 남아 있어 6단계는 완료로 표시하지 않는다.

- [ ] **6-1. 운영 정책** **부분:** 회원만 신청, 글자 수 제한, 신청자 이름 공개, 재생 중인 곡 삭제 불가는 코드로 정해짐. 남은 작업: 사연 공개 동의, 접수 제한 정책
- [ ] **6-2. 음원·데이터 계약** **부분:** YouTube 영상 ID, 상태 `pending → queued → playing → played`와 `cancelled`, 동시 재생 1곡. 남은 작업: 음원 사용 권한 확정
- [x] **6-3. 고객 접수:** 신청 폼 검증·오류·접수 결과, 대기 목록, 현재 곡·사연 공개 근거: [musicbox/](../frontend/app/(public)/musicbox/)
- [x] **6-4. 관리자 선곡:** 링크 연결, 미리보기, 재생 목록 순서, 지금 재생, 완료·취소 근거: [admin/songs/_actions.ts](../frontend/app/admin/songs/_actions.ts)
- [x] **6-5. 재생 경험:** 서버 시각 기준 동기화와 변경 감지 갱신 근거: `MusicBoxRefresher`, `useYouTubePlayback`
- [ ] **6-6. 완료 검증:** 실제 음원으로 두 사용자 세션에서 신청→선곡→재생→완료를 확인한다. **코드로 확인 불가**

### 7단계. 고객이 리뷰 작성하고 관리자가 확인 (최신 WBS·백엔드 범위 밖)

- [ ] 완료한 주문에서 리뷰를 작성한다. 작성 가능 조건과 중복 작성 정책을 반영한다. (청사진 WBS 14.1) **미구현**
- [ ] 내 리뷰 목록·수정·삭제 화면을 만든다. (청사진 WBS 14.2~14.4) **미구현**
- [ ] 관리자 인덱스에서 리뷰 목록으로 이동하고, 목록 → 상세 → 수정·삭제 흐름을 만든다. 관리자 리뷰 등록은 의미가 확정되면 추가한다. (청사진 WBS 13.x) **미구현**
- [ ] 주문 완료 → 리뷰 작성 → 관리자 조회 흐름을 점검한다. **미구현**

### 8단계. 회원 정보 관리

- [ ] 고객 프로필 조회·수정 화면을 만든다. (WBS 1.4~1.5) **부분:** `/my`에서 조회 가능. 남은 작업: `/profile/update` 수정 화면
- [x] 관리자 인덱스에서 회원 목록으로 이동하고, 목록 → 상세 → 상태 변경 흐름을 만든다. (WBS 2.x) 근거: [admin/users/](../frontend/app/admin/users/)
- [x] 계정 상태 변경이 고객의 접근과 화면 상태에 반영되는지 점검한다. 근거: 정지 회원은 `getCurrentUser`가 `null`을 반환 ([session.ts](../frontend/app/_lib/session/session.ts))

### 9단계. 전체 연결과 품질 확인

- [ ] 기능별 데이터 연결을 전체 흐름에서 다시 확인하고 로딩·오류·재시도 동작을 점검한다. **코드로 확인 불가.** 백엔드 연결은 8장 참고
- [ ] 메뉴 등록부터 조회·주문·결제·뮤직박스·리뷰까지 한 시나리오로 검증한다. **코드로 확인 불가.** `e2e/` 폴더 없음
- [ ] 고객·관리자 화면을 모바일과 데스크톱에서 점검한다. **코드로 확인 불가**
- [ ] 폼 검증, 키보드 사용, 상태 메시지, 접근성을 점검한다. **코드로 확인 불가.** 8장의 갭을 정리한 뒤 점검

---

## 8. 규칙 갭과 작업 분배표

"규칙 갭"은 5장의 규칙과 다른 현재 코드이며, 2026-10-22 코드에서 확인한 것만 적었다. "선행 의존"은 그 쌍을 시작하기 전에 끝나야 하는 작업이다.

### 8-1. 공통 갭 (특정 쌍에 속하지 않음)

| 갭 | 위치 | 규칙 |
| --- | --- | --- |
| 루트 metadata에 `title.template`, `metadataBase`, `openGraph`가 없음 | [app/layout.tsx](../frontend/app/layout.tsx) | 5-5 |
| 페이지별 metadata가 세 페이지에만 있고, 그마저 서비스명을 직접 붙임(`"회원가입 \| 삼다방"`) | `(public)/signup/page.tsx`, `admin/users/page.tsx`, `admin/users/[id]/page.tsx` | 5-5 |
| `(customer)`·`admin`·`/login`·`/signup`·`/forbidden`에 noindex가 없음 | 각 layout과 page | 5-5 |
| `robots.ts`, `sitemap.ts`가 없음 | `app/` | 5-5 |
| 본문 바로가기(skip link)가 없음 | [app/layout.tsx](../frontend/app/layout.tsx) | 5-4 |
| `(public)` 페이지마다 `<main>`을 직접 그림. 그룹 layout은 `children`만 반환함 | [(public)/layout.tsx](../frontend/app/(public)/layout.tsx), `(public)`의 page 6개 | 5-4 |
| h1이 page 밖에 있음 | `SignupForm.tsx:81`, 공통 `StatePanel`(`/forbidden`, `error.tsx`, `not-found.tsx`) | 5-4 |
| `proxy.ts`와 `/api/v1` rewrites가 없음. 백엔드 요청기(`app/_lib/api/`)가 없음 | `frontend/` | 5-6, 5-7 |
| 라우트별 `loading.tsx`·`error.tsx`가 루트와 `admin/menus/loading.tsx`에만 있음 | `app/` | 5-1 |
| 공유 컴포넌트 `MenuCard`를 `(public)`의 두 화면만 쓰는데 `app/_components`에 있음 | [MenuCard.tsx](../frontend/app/_components/MenuCard.tsx) (`/`, `/menus`가 사용) | 5-1 |
| 다른 라우트의 `_components`를 가져다 씀 | `(public)/page.tsx` → `./musicbox/_components/MusicBoxHighlight`. `my/songs/page.tsx`·`DeleteRequestForm.tsx` → `(public)/musicbox/_components/*` 6건. `admin/songs/page.tsx`·`OnAirPlayer.tsx`·`YouTubePreview.tsx` → `(public)/musicbox/_components/*` 3건 | 5-1 |
| 장바구니 Context가 루트 layout에서 모든 화면을 감쌈 | [app/layout.tsx](../frontend/app/layout.tsx), [CartContext.tsx](../frontend/app/_lib/cart/CartContext.tsx) | 5-2 |
| GLOSSARY와 다른 화면 문구: "기본 카테고리" | [CategoryRow.tsx:31](../frontend/app/admin/categories/_components/CategoryRow.tsx#L31) | 5-8 |

### 8-2. 페이지-컨트롤러 쌍별 작업

| 쌍 | 프론트 경로 | 규칙 갭 | 남은 기능 작업 | 선행 의존 |
| --- | --- | --- | --- | --- |
| `/login` ↔ `AuthController` | `app/(public)/login/` | metadata 없음(noindex), `<main>`을 page가 그림 | 로그인 API 연결, 목 세션을 백엔드 인증으로 교체 | 백엔드 Auth API, 인증 방식 결정(6-2) |
| `/signup` ↔ `AuthController` | `app/(public)/signup/` | h1이 `SignupForm` 안에 있음, title에 서비스명 직접 표기, noindex 없음 | 가입 API 연결 | `/login`과 같음 |
| `/my` ↔ `my/UsersController` | `app/(customer)/my/page.tsx` | metadata 없음 | `GET /api/v1/my` 연결, 로그아웃을 Auth API로 연결 | Auth |
| `/profile/update` ↔ `my/UsersController` | (없음) | — | 화면 신규 작성(WBS 1.4) | `/my` 연결 |
| `/admin/users`, `/admin/users/[id]` ↔ `admin/UsersController` | `app/admin/users/` | title에 서비스명 직접 표기 | API 연결. 관리자 계정 상태 변경 거부 유지 | Auth, 백엔드 admin/Users API |
| `/admin/users/new` ↔ `admin/UsersController` | (없음) | — | 화면 신규 작성(DB 설계 확장) | `/admin/users` 연결 |
| `/admin/categories` ↔ `admin/CategoriesController` | `app/admin/categories/` | metadata 없음 | **API 연결 가능(백엔드 구현됨).** id를 UUID에서 Long으로. 위·아래 이동을 `PUT /order`(전체 순서)로. `isFallback`·`displayOrder`·`menuCount` 반영. "기본 카테고리" 문구를 "기타 카테고리"로 | Auth(관리자 권한). 인증 전 연결은 임시 |
| `/admin/menus` ↔ `admin/MenusController` | `app/admin/menus/page.tsx` | metadata 없음. URL `category`(이름)가 API `categoryId`와 다름. 페이지 이동 없음 | **API 연결 가능.** `categoryId`·`page`(1부터) URL 상태 추가, `MenuPageResponse` 사용 | `/admin/categories` 연결 |
| `/admin/menus/new`, `/admin/menus/[id]/edit` ↔ `admin/MenusController` | `app/admin/menus/new/`, `[id]/edit/`, `_components/MenuForm.tsx`, `_actions.ts` | metadata 없음 | **API 연결 가능.** 폼을 `MenuCreateRequest`·`MenuUpdateRequest`에 맞춤: `slug` 입력 추가, 카테고리 하나(`categoryId`), `supportsHot`·`supportsIced`, `nameEn` 처리 결정. 이미지 파일 업로드는 백엔드 계약이 없어 결정 필요 | `/admin/categories` 연결, 6-2 `nameEn`·카테고리 결정 |
| `/admin/menus/[id]` ↔ `admin/MenusController` | `app/admin/menus/[id]/` | metadata 없음 | **API 연결 가능.** id를 Long으로, 삭제는 숨김 처리 응답 반영 | `/admin/menus` 연결 |
| `/menus` ↔ `MenusController`(공개) | `app/(public)/menus/page.tsx` | metadata·canonical 없음, `<main>`을 page가 그림 | 공개 메뉴 API 연결 | 백엔드 공개 Menus API, 6-2 `category` 값 형식 |
| `/menus/[slug]` ↔ `MenusController`(공개) | `app/(public)/menus/[slug]/` | `generateMetadata` 없음. 대화상자 확인 버튼이 `router.push("/cart")`, `router.push("/login?next=…")`로만 이동(`OrderPanel.tsx:195,203`) | slug 기반 조회로 전환. 온도 옵션을 `supportsHot`/`supportsIced`로. 담기를 `my/CartItems` API로 | `/menus` 연결, `/cart` API |
| `/` ↔ `HomeController` | `app/(public)/page.tsx` | `<main>`을 page가 그림, 다른 라우트 컴포넌트 import(`MusicBoxHighlight`) | `index/menus`·`index/songs` API 연결 | 공개 Menus, 공개 Songs API |
| `/cart` ↔ `my/CartItemsController` | `app/(customer)/cart/` | 화면 전체가 클라이언트(`CartView`). "주문하기"가 `router.push("/checkout")`로만 이동(`CartView.tsx:22`). 장바구니 Context+localStorage | 서버 장바구니 API 연결, 주문 대상 체크는 로컬 상태로, 옵션 값 `iced` | `/menus/[slug]` 담기, Auth |
| `/checkout` ↔ `my/OrdersController` | `app/(customer)/checkout/` | 화면 전체가 클라이언트(`CheckoutView`). `../cart/cart.module.css`를 다른 라우트에서 가져옴. h1·버튼 문구 "주문 / 결제", "결제하기", "최종 결제 금액"이 카운터 결제수단 용어와 다름 | `POST /api/v1/orders` 연결(주문 대상 `cartItemIds`, 수령 방식, 카운터 결제수단, 요청사항). 주문 대상 항목 조회 방식 결정 | `/cart` API, 6-2 주문서 조회 결정 |
| `/my/orders`, `/my/orders/[id]` ↔ `my/OrdersController` | `app/(customer)/my/orders/` | metadata 없음 | 목록·상세 API 연결. 고객 취소 유지 여부 결정(6.2 보류) | `/checkout` 연결 |
| `/admin/orders`, `/admin/orders/[id]` ↔ `admin/OrdersController` | `app/admin/orders/` | metadata 없음. `page.tsx` 226줄에 필터·정렬·구역 페이지 계산과 하위 컴포넌트(`StatusControls`, `Receipt`)가 함께 있음. 상태 select에 화면에 보이는 label 대신 `aria-label` 사용(`StatusChangeForm.tsx`) | API 연결, `status_version` 충돌 처리, 관리자 취소를 `received`만 허용하도록 맞춤(현재 `preparing`도 허용, `mock/orders.ts`의 `allowedAdminOrderStatuses`) | `/checkout` 연결, 관리자 취소 계약(6-2) |
| `/musicbox` ↔ `SongsController`(공개) | `app/(public)/musicbox/` | metadata·canonical 없음, `<main>`을 page가 그림. 여러 라우트가 이 폴더의 `_components`를 가져다 씀(공통으로 올릴 대상) | 공개 목록·현재 곡 API 연결, 신청을 `my/Songs` API로. 변경 감지 방식 결정 | Auth(신청), 백엔드 Songs API |
| `/my/songs` ↔ `my/SongsController` | `app/(customer)/my/songs/` | metadata 없음, `(public)/musicbox/_components`를 6건 가져다 씀 | 내 신청 조회·삭제 API 연결. 현재 곡 표시 방식 결정 | `/musicbox` 연결 |
| `/admin/songs` ↔ `admin/SongsController` | `app/admin/songs/` | metadata 없음, `page.tsx` 203줄, `(public)/musicbox/_components`를 3건 가져다 씀 | 관리자 선곡 API 8종 연결 | `/musicbox` 연결 |
| `/admin` (컨트롤러 없음) | `app/admin/page.tsx` | metadata 없음 | 관리자 Menus·Orders·Songs API로 집계 교체 | 세 관리자 쌍 연결 |
| `/forbidden` (컨트롤러 없음) | `app/forbidden/page.tsx` | h1이 `StatePanel` 안에 있음, noindex 없음 | — | — |
| 결제·결제수단 화면 | (없음) | — | 보류(Q1) | 주문 연결 완료, Q1 결정 |
| 리뷰 화면 | (없음) | — | 범위 밖 | 범위 재결정 |

### 8-3. 권장 진행 순서

1. **기반:** 공통 갭 중 구조와 SEO 기본값(8-1), 백엔드 요청기, `/api/v1` 프록시
2. **인증:** `/login`, `/signup`, `/my`. 이후 모든 고객·관리자 쌍의 전제
3. **관리자 카탈로그:** `/admin/categories` → `/admin/menus`(4개 화면). 백엔드가 이미 구현돼 있음
4. **공개 조회:** `/menus` → `/menus/[slug]` → `/`
5. **주문:** `/cart` → `/checkout` → `/my/orders` → `/admin/orders`
6. **뮤직박스:** `/musicbox` → `/my/songs` → `/admin/songs`
7. **회원:** `/admin/users` → `/profile/update`, `/admin/users/new`
8. **집계:** `/admin`

---

## 9. PR 체크리스트

### 매핑·범위

- [ ] PR이 하나의 페이지-컨트롤러 쌍(또는 같은 주 컨트롤러를 공유하는 쌍들)을 다룬다
- [ ] 대응 컨트롤러·엔드포인트가 2장 매핑표와 일치한다. 보조 컨트롤러는 2-3 예외 목록에 있는 것만 쓴다
- [ ] 페이지 URL을 추가·변경·삭제했다면 매핑표와 백엔드 청사진의 페이지 표를 함께 고쳤다
- [ ] 화면 문구와 문서가 GLOSSARY 용어를 따른다

### 구조

- [ ] 라우트 전용 코드가 해당 라우트 폴더 안에 있다
- [ ] 공통 위치로 올린 코드는 실제로 두 곳 이상에서 쓰인다
- [ ] 다른 라우트의 `_components`·`_lib`를 import하지 않는다
- [ ] `page.tsx`는 조립만 한다

### 컴포넌트

- [ ] 클라이언트 컴포넌트는 상호작용 부분만 떼어 낸 단위다
- [ ] 공통 UI(`app/_components/ui/`)가 도메인 타입·API·URL에 의존하지 않는다
- [ ] props 전달만 하는 래퍼나 미리 만든 추상화가 없다
- [ ] 긴 상태 로직은 훅으로, 순수 함수는 `_lib`로 분리돼 있다
- [ ] 파일명·export 방식이 네이밍 규칙을 따른다

### 데이터·API

- [ ] 엔드포인트·요청·응답 형식이 백엔드 청사진과 DTO 코드와 일치한다
- [ ] 프론트 타입의 필드명·타입이 백엔드 DTO와 일치한다
- [ ] 백엔드 청사진에 없는 API를 가정해서 쓰지 않았다
- [ ] 변경은 Server Action으로 하고, 권한을 확인하며, `revalidatePath`로 관련 경로를 모두 갱신한다

### 상태

- [ ] 공유·북마크 의미가 있는 상태는 URL에 있다
- [ ] URL 값은 page에서 파싱·검증한 뒤 props로 내려간다
- [ ] 같은 상태를 URL과 `useState`에 중복으로 들고 있지 않다
- [ ] 서버 데이터를 클라이언트 전역 상태에 복사하지 않는다
- [ ] `"use client"`는 필요한 leaf에만 있다(`error.tsx` 제외)

### 접근성

- [ ] 본문 바로가기, header·nav·main·footer 랜드마크가 있고 `main`은 그룹 layout에 하나만 있다
- [ ] h1이 page에 하나 있고 헤딩 순서를 건너뛰지 않는다
- [ ] 클릭 가능한 요소는 button 또는 a다
- [ ] 아이콘 버튼에 `aria-label`, 이미지에 `alt`가 있다
- [ ] 폼 입력에 화면에 보이는 label이 연결되고, 오류 메시지는 `aria-describedby`로 연결된다
- [ ] 키보드만으로 모든 기능을 쓸 수 있고 포커스 표시가 보인다
- [ ] 대화상자는 포커스 가두기·Esc·포커스 복귀를 지원한다
- [ ] 동적 변경은 `role="status"`·`role="alert"`로 안내한다
- [ ] 명도 대비가 4.5:1 이상이고, 색상만으로 상태를 구분하지 않는다

### SEO

- [ ] 공개 페이지에 고유한 title·description이 있다(서비스명은 template으로 붙음)
- [ ] canonical이 설정돼 있다(목록은 필터·정렬·검색어·flash 제외, page 유지)
- [ ] 핵심 콘텐츠가 초기 HTML에 포함된다
- [ ] 페이지 이동이 `<a href>`(`next/link`)로 되어 있다
- [ ] 데이터 없는 동적 페이지는 `notFound()`로 404를 응답한다
- [ ] 로그인 필요 페이지와 인증 화면은 noindex다
- [ ] 공개·색인 페이지가 sitemap에 포함된다

### 검증 도구

- `npm run lint`, `npm run typecheck` (`frontend/`)
- Lighthouse(접근성·SEO 점수), axe DevTools, `eslint-plugin-jsx-a11y`
- Tab 키로 전체 흐름을 직접 돌아보기
