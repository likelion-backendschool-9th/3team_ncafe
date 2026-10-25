# 공개 메뉴·홈 프론트 연결 계획

## 한눈에

- 끝나면: `/menus`, `/menus/[slug]`, `/`의 추천 메뉴가 목 저장소 대신 백엔드 공개 메뉴 API(#76)를 읽는다. 관리자 API로 등록한 메뉴가 방문자 화면에 보인다.
- 결정 필요: 없음 (아래 가정으로 진행하고 PR에 적는다)
- 규모: 7단계
- 현재 (10-25): 1단계 진행 중
- 위치: `docs/menus/`의 프론트 계획. 백엔드 계획은 `docs/menus/2026-10-25-backend-public-menus.md`(#76).

## 대상 쌍

| 페이지 | 주 컨트롤러 | 엔드포인트 (`/api/v1` 생략) |
| --- | --- | --- |
| `/menus` | `MenusController`(공개) | `GET /menus`, `GET /menus/categories` |
| `/menus/[slug]` | `MenusController`(공개) | `GET /menus/{slug}` |
| `/` | `HomeController` | `GET /index/menus` |

세 쌍 모두 공개 `Menus`·`Home` 메뉴 조회라 한 PR로 묶는다. `/`의 `GET /index/songs`는 곡 API가 없어 범위 밖이다.

## 1. 메뉴 목록 `/menus`

방문자는 백엔드 메뉴를 검색어·카테고리·정렬로 거르고 본다.

F1 기본 목록
- Given 백엔드에 숨기지 않은 메뉴가 있다.
- When `/menus`를 연다.
- Then 서버에서 `GET /menus?size=100`으로 받은 메뉴를 최신 등록순으로 보여 주고, 개수는 `totalElements`다. 판매 중지 메뉴는 `품절`로 보인다.

F2 카테고리 필터
- Given 카테고리 `커피`(id 2), `차`(id 3)가 있다.
- When `차` 탭을 누른다.
- Then URL이 `/menus?categoryId=3`이 되고 `GET /menus?categoryId=3`의 메뉴만 보인다. 탭은 `GET /menus/categories` 순서다.

F3 검색·정렬
- When 검색어 `커`, 정렬 `가격 낮은순`으로 제출한다.
- Then URL이 `/menus?q=커&sort=price-low`가 되고 API에 같은 값을 넘긴다. 카테고리 선택은 유지한다.

F4 잘못된 URL 값
- When `/menus?sort=cheap&categoryId=abc`를 연다.
- Then 잘못된 값은 버리고 기본값(최신순, 전체)으로 조회한다. API `400`을 일으키지 않는다.

F5 결과 없음
- Then 메뉴가 하나도 없으면 "등록된 메뉴가 아직 없어요.", 조건 때문에 없으면 "조건에 맞는 메뉴가 없어요."와 초기화 링크를 보여 준다.

## 2. 메뉴 상세 `/menus/[slug]`

F6 정상
- When 목록에서 `커피` 카드를 누른다.
- Then `/menus/coffee`로 이동하고 `GET /menus/coffee`의 이름·가격·설명·사진·카테고리·판매 상태·온도를 보여 준다. 제목은 `커피`, canonical은 `/menus/coffee`다.

F7 판매 중지
- Given `fresh-arrowroot-juice`가 판매 중지다.
- Then 상세가 열리고 `품절` 배지와 담기 불가 상태가 보인다.

F8 없음
- When `/menus/unknown`을 연다.
- Then API `404`를 받아 `notFound()` 화면을 보여 준다.

## 3. 홈 추천 메뉴 `/`

F9 정상
- Then 추천 메뉴 영역이 `GET /index/menus`의 메뉴(최대 16개)를 보여 준다.

F10 없음
- Then 빈 목록이면 기존 안내 문구 "추천 메뉴가 아직 없어요…"를 보여 준다.

## 작업 순서

1. 계획 문서 저장
   - 파일: `docs/menus/2026-10-25-frontend-public-menus.md`
   - 커밋: `docs: 공개 메뉴 프론트 연결 계획 추가`
2. 공통 요청기
   - 파일: `frontend/app/_lib/api/client.ts`, `frontend/.env.local.example`에 `API_ORIGIN`
   - #65·#68에 있는 같은 파일과 내용을 똑같이 맞춘다. 같은 파일을 같은 내용으로 추가하면 머지 순서와 관계없이 충돌하지 않는다.
   - 커밋: `chore: 백엔드 공통 요청기 추가`
3. 공개 메뉴 타입·조회·카드
   - 파일: `app/(public)/_lib/menus/types.ts`(백엔드 `MenuResponse`·`MenuPageResponse`·`MenuCategoryResponse`), `app/(public)/_lib/menus/api.ts`(응답 검증 후 정규화)
   - `app/_components/MenuCard.tsx`(+ CSS)를 `app/(public)/_components/`로 옮기고 새 타입을 쓴다. 링크는 `/menus/{slug}`.
   - 커밋: `refactor: 공개 메뉴 카드를 공개 영역으로 옮기고 API 타입 적용` (4단계와 함께 빌드가 통과하도록 4·5·6단계와 같은 커밋에 넣을 수 있다)
4. `/menus` — F1~F5
   - 파일: `app/(public)/menus/page.tsx`, `app/(public)/menus/_lib/searchParams.ts`
   - 목 필터·정렬 코드를 지우고 URL을 파싱해 API에 넘긴다. metadata(title `메뉴`, canonical `/menus`)
   - `docs/FRONTEND.md`의 `/menus` 매핑·URL 상태를 `category` → `categoryId`로 고친다.
5. `/menus/[slug]` — F6~F8
   - 파일: `app/(public)/menus/[slug]/page.tsx`. `cache()`로 감싼 조회를 `generateMetadata`와 page가 같이 쓴다.
   - `supportsHot`/`supportsIced` → `OrderPanel`의 `temperatures`, `menuId`는 `String(id)`. `OrderPanel`은 고치지 않는다.
6. `/` — F9, F10
   - 파일: `app/(public)/page.tsx`. `pickFeatured` 대신 `GET /index/menus`.
   - 커밋: `feat: 공개 메뉴·홈 추천 화면을 백엔드 API에 연결` (3~6단계)
7. 확인
   - `npm run lint`, `npm run typecheck`
   - 백엔드 `feature/public-menu-api`를 별도 작업 폴더에서 띄우고 ncafedb의 `커피`·`생칡즙`으로 F1~F10을 브라우저에서 확인한다.

## 브랜치·커밋

- `feature/public-menu-frontend` (`origin/develop` 기준). PR 대상은 `develop`, 머지는 사람이 한다.
- 백엔드 #76보다 먼저 머지되면 화면이 API를 찾지 못한다. PR 본문에 #76 이후 머지를 적는다.

## 범위 밖

- 장바구니 담기 API(`POST /menus/{id}/cart/items`)와 `/cart` 연결: 장바구니 계획
- 관리자 메뉴·카테고리 화면 API 연결: 관리자 메뉴 쌍. 그때까지 관리자 화면에서 등록한 메뉴는 방문자 화면에 나오지 않는다.
- `/`의 신청곡 영역(`GET /index/songs`): 곡 API가 생긴 뒤
- 8-1 공통 갭 중 `<main>`을 그룹 layout으로 옮기기, 루트 metadata template, 홈의 `musicbox` 컴포넌트 import

## 가정

- 주문하기: 상세에서 담는 `menuId`가 백엔드 Long id(`"5"`)로 바뀐다. 목 주문 저장소(`_lib/mock/orders.ts`)는 목 메뉴 UUID로 메뉴를 찾으므로 `/checkout` 주문 확정이 "판매하지 않는 메뉴" 오류로 실패한다. 담기와 `/cart` 화면은 동작한다. `/checkout`이 주문 API에 연결되면 해결된다. 쌍 단위 전환(FRONTEND.md 5-6)에서 생기는 틈이라 PR에 적고 팀에 알린다.
- URL 카테고리: `category=이름` 대신 `categoryId=숫자`. FRONTEND.md 5-2 "URL 파라미터 이름은 API 쿼리와 맞춘다"와 백엔드 계약을 따른다.
- 페이지: 백엔드 계획대로 `size=100`으로 한 번에 받는다. 100개를 넘으면 URL `page`(1부터)와 페이지 링크를 붙인다.
- 영어 이름: 백엔드 메뉴에 `nameEn`이 없어 상세의 영어 이름을 지우고, 검색 안내 문구를 "메뉴 이름"으로 바꾼다. 백엔드 검색은 이름·slug를 본다.
- 카테고리: 백엔드는 메뉴당 카테고리 하나(`categoryName`)다. 세트 메뉴의 온도 라벨은 `categoryName === "세트"`로 정한다.
- 인증: 공개 조회라 쿠키가 없어도 된다. 인증 PR #61이 먼저 머지되면 공개 GET 경로 허용이 필요하다(#76에 적음).
- 오류: 백엔드가 꺼져 있거나 `404` 외 오류면 예외를 그대로 던져 `error.tsx`가 처리한다.

## 참고

- 2026-10-25 확인: #65·#68의 `frontend/app/_lib/api/client.ts`와 `.env.local.example`이 서로 같다(`apiFetch`, `ApiRequestError`, `API_ORIGIN=http://localhost:8080`).
- 2026-10-25 확인: `MenuCard`는 `(public)/page.tsx`와 `(public)/menus/page.tsx`만 쓴다.
- 2026-10-25 확인: 목 `mockMenuRepository`는 관리자 화면·관리자 카테고리·목 주문도 쓰므로 이번에 지우지 않는다.
