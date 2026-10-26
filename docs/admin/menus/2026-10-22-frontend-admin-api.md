# 관리자 메뉴·카테고리 화면 API 연결 계획

## 한눈에

- 끝나면: `/admin/categories`와 `/admin/menus` 화면이 목 저장소 대신 Spring 백엔드 API를 읽고 쓴다. 백엔드와 프론트를 함께 띄워 관리자로 로그인한 뒤 추가·수정·순서 변경·삭제·검색이 DB에 반영되는 것을 브라우저와 e2e로 확인할 수 있다.
- 결정 필요: 없음 (카테고리 화면 함께 연결, 이미지 업로드는 이번에 숨김 — 10-22 사용자 답변)
- 규모: 7단계, PR 2개(카테고리 → 메뉴), 약 6~7시간
- 위치: `docs/admin/menus/`의 프론트엔드 계획. 백엔드 계약은 [카테고리 계획](../categories/2026-10-21-backend-category-management.md)과 [메뉴 계획](./2026-10-22-backend-menu-management.md)을, 프론트 구조는 [`docs/FRONTEND.md`](../../FRONTEND.md)를 따른다.

## 1. 백엔드 호출 기반 (R1)

Next 서버(서버 컴포넌트·서버 액션)가 기존 `apiFetch`(`app/_lib/api/client.ts`)로 `API_ORIGIN`의 API를 호출한다. `apiFetch`는 세션 쿠키를 전달하고 실패 응답 `{code, message}`를 `ApiRequestError`로 바꾼다. 변경 요청은 CSRF 토큰 헤더를 함께 보낸다.

S1 정상
- Given `.env.local`에 `API_ORIGIN=http://localhost:8080`이 있고 백엔드가 떠 있으며 관리자로 로그인했다.
- When `/admin/menus`를 연다.
- Then 백엔드 `GET /api/v1/admin/menus` 응답으로 표가 그려진다.

S2 백엔드 꺼짐
- Given 백엔드가 꺼져 있다.
- When `/admin/menus` 또는 `/admin/categories`를 연다.
- Then 라우트의 `error.tsx`가 "메뉴 정보를 불러오지 못했습니다"(카테고리는 "카테고리 정보를 불러오지 못했습니다")와 "다시 시도" 버튼을 보여 주고, 관리자 레이아웃의 다른 화면 이동 링크는 동작한다.

S2-1 CSRF
- Given 관리자로 로그인했다.
- When 카테고리를 추가한다.
- Then 요청에 `csrfHeaders()`로 받은 토큰 헤더가 붙어 `403` 없이 저장된다.

## 2. 관리자 카테고리 화면 (R2)

카테고리 목록·추가·이름 수정·순서 변경·삭제가 백엔드 카테고리 API를 사용한다.

S3 목록
- Given 백엔드에 `커피(menuCount=2)`, `기타(menuCount=0)`가 순서대로 있다.
- When `/admin/categories`를 연다.
- Then 두 줄이 그 순서로 보이고 `커피`의 메뉴 수는 2, `기타`는 수정·삭제 버튼이 잠겨 있다.

S4 추가·수정
- When `" 차 "`를 추가하고, `차`를 `녹차`로 이름 수정한다.
- Then 목록에 `녹차`가 마지막 순서로 보이고 새로고침해도 유지된다.

S5 중복 이름
- Given `커피`가 있다.
- When `커피`를 추가한다.
- Then 백엔드 `409` 메시지 "이미 존재하는 카테고리입니다."가 입력란 아래에 보인다.

S6 순서 변경
- Given 순서가 `[커피, 녹차, 기타]`다.
- When `녹차`의 ▲를 누르거나 `녹차`를 `커피` 위로 끈다.
- Then `PUT /api/v1/admin/categories/order`에 `[녹차, 커피, 기타]`의 ID 전체가 전달되고 새로고침해도 `[녹차, 커피, 기타]`다.

S7 삭제
- Given `커피`에 메뉴 2개가 있다.
- When `커피`를 삭제한다.
- Then 목록에서 사라지고 `기타`의 메뉴 수가 2가 된다.

## 3. 메뉴 목록 (R3)

메뉴 목록의 검색·카테고리·상태·정렬·페이지를 URL 쿼리로 받아 백엔드 목록 API에 전달한다. URL `page`는 1부터, API `page`는 0부터 센다.

S8 검색·필터
- Given 백엔드에 `아메리카노(커피, 판매 중)`, `카페라떼(커피, 판매 중지)`, `모나카(다과)`가 있다.
- When 메뉴명 `라떼`, 카테고리 `커피`, 상태 `판매 중지`로 검색한다.
- Then 주소가 `?q=라떼&categoryId=<커피 id>&status=unavailable`이 되고 `카페라떼` 1줄만 보인다.

S9 정렬
- When 정렬을 `가격 높은순`으로 바꿔 검색한다.
- Then 가격 내림차순으로 보인다.

S10 페이지
- Given 메뉴가 25개다.
- When 목록을 열고 `다음` 페이지로 이동한다.
- Then 첫 화면(`page` 없음, API `page=0`)에 1~20번째 메뉴와 "1 / 2 페이지", 다음 화면(`?page=2`, API `page=1`)에 21~25번째 메뉴 5줄과 "2 / 2 페이지"가 보이고 검색 조건은 유지된다.

S11 표시 항목
- When 목록을 연다.
- Then 영문명 대신 slug가 보이고, 카테고리는 이름 하나만 보인다.

## 4. 메뉴 등록 (R4)

등록 폼은 slug·카테고리 하나·온도 옵션을 백엔드 형식으로 보내고, 이미지 파일 업로드 입력은 보이지 않는다.

S12 정상
- Given `커피` 카테고리가 있다.
- When slug `americano`, 메뉴명 `아메리카노`, 카테고리 `커피`, 가격 4500, 핫·아이스를 선택해 등록한다.
- Then `/admin/menus?created=<id>`로 이동해 "메뉴가 등록되었습니다"와 새 줄이 보인다.

S13 온도 없음·기본 이미지
- When 핫·아이스를 모두 끄고 이미지 주소를 비운 채 `모나카`를 등록한다.
- Then 등록되고 상세에서 "온도 구분 없음"과 기본 이미지가 보인다.

S14 입력 오류
- When slug `Ameri Cano`, 가격 0 중 하나로 등록한다.
- Then 해당 입력란 아래에 오류가 보이고 입력한 값은 유지된다.

S15 slug 중복
- Given `americano` 메뉴가 있다.
- When 같은 slug로 등록한다.
- Then slug 입력란 아래에 "이미 사용 중인 slug입니다."가 보인다.

S16 업로드 숨김
- When 등록·수정 폼을 연다.
- Then 이미지 파일 입력은 없고 이미지 주소 입력만 있다.

## 5. 메뉴 상세·수정 (R5)

상세·수정 화면은 숫자 ID로 백엔드 메뉴를 읽고, 수정 폼에서 slug는 바꿀 수 없다.

S17 상세
- When `/admin/menus/1`을 연다.
- Then slug, 카테고리 이름, 온도("핫, 아이스"), 가격, 판매 상태, 등록일·최근 수정일이 보인다.

S18 수정
- When `/admin/menus/1/edit`에서 가격을 5000, 카테고리를 `다과`로 바꿔 저장한다.
- Then `/admin/menus/1?updated=1`로 이동해 바뀐 값이 보이고, slug는 읽기 전용으로 표시된다.

S19 없음
- When `/admin/menus/999`, `/admin/menus/abc`, 숨긴 메뉴의 상세·수정 주소를 연다.
- Then Next의 404 화면이 보인다.

## 6. 메뉴 삭제 (R6)

삭제 버튼은 백엔드 숨김 API를 호출한다.

S20 정상
- When 목록이나 상세에서 `아메리카노`를 삭제하고 확인한다.
- Then `/admin/menus?deleted=1`로 이동해 "메뉴를 삭제했습니다"가 보이고 목록에서 사라진다.

S21 이미 삭제됨
- Given 다른 창에서 같은 메뉴를 먼저 삭제했다.
- When 이 창에서 삭제한다.
- Then `/admin/menus?missing=1`의 "이미 삭제되었거나 존재하지 않는 메뉴입니다"가 보인다.

## 범위 밖

- 관리자 대시보드(`/admin`), 장바구니·주문: 목 저장소를 계속 쓴다. 대시보드의 메뉴 수는 실제 관리자 목록과 다를 수 있으며, 별도 작업으로 연결한다.
- 공개 메뉴(`/menus`, `/menus/[slug]`): #77에서 이미 백엔드에 연결되어 있다(`app/(public)/_lib/menus/api.ts`). 이번 작업으로 관리자 화면의 변경이 손님 화면에 바로 보이므로, 확인 단계에서 함께 본다.
- 이미지 파일 업로드: 저장소를 정한 뒤 별도 작업. 업로드 코드(`app/_lib/mock/uploads.ts`)는 지우지 않는다.
- 목 데이터의 백엔드 이관. 백엔드 DB는 `기타`만 있는 상태에서 시작한다.

## 작업 순서

### PR 1 — 카테고리 (`feature/admin-category-frontend`)

1. 계획 문서 저장 — 전체
   - 파일: 이 문서
   - 커밋: `docs: 관리자 화면 API 연결 계획 추가`
2. CSRF 헬퍼 공통화 — S2-1
   - 파일: `admin/users/_lib/api.ts`의 `csrfHeaders()`를 `app/_lib/api/client.ts`로 올리고, `admin/users/_actions.ts`의 import를 바꾼다. 두 번째 사용처가 생기면 공통 부모로 올리는 FRONTEND.md 5-1 규칙을 따른다.
   - 커밋: `refactor: CSRF 헤더 헬퍼를 공통 API 클라이언트로 이동`
   - 확인: `cd frontend && npm run typecheck && npm run lint`
3. 카테고리 화면 — S2, S3~S7. 상세는 [카테고리 화면 계획](../categories/2026-10-26-frontend-admin-categories.md)
   - 파일: `app/admin/categories/_lib/api.ts`(조회, 응답 검증), `_actions.ts`(변경, `csrfHeaders()` 사용), `page.tsx`, `loading.tsx`, `error.tsx`, `_components/CategoryList.tsx`(▲▼·드래그 모두 전체 ID 배열로 `reorder` 호출), `CategoryRow.tsx`, `DeleteCategoryDialog.tsx`, `frontend/e2e/admin-categories.spec.ts`
   - 확인: 같은 명령 + `npm run test:e2e -- admin-categories`

### PR 2 — 메뉴 (`feature/admin-menu-frontend`, PR 1 머지 후 `develop`에서 분기)

4. 메뉴 목록 — S1, S2, S8~S11
   - 파일: `app/admin/menus/_lib/api.ts`(조회, 요청 시 `page - 1`·응답 시 `page + 1` — `admin/users/_lib/api.ts`와 같은 방식), `page.tsx`, `error.tsx`, `_components/MenuTable.tsx`, 페이지 이동 링크
5. 등록·수정 폼 — S12~S16, S18
   - 파일: `_actions.ts`(검증을 백엔드 규칙에 맞춤, `csrfHeaders()` 사용, 409·400 응답을 입력란 오류로), `_components/MenuForm.tsx`(영문명 제거, slug 추가, 카테고리 단일 선택, 파일 입력 제거), `new/page.tsx`, `[id]/edit/page.tsx`
6. 상세·삭제 — S17, S19~S21
   - 파일: `[id]/page.tsx`, `_actions.ts`의 `deleteMenu`
7. 전체 확인 — S1~S21
   - 파일: `frontend/e2e/admin-menus.spec.ts`
   - [`frontend/e2e/README.md`](../../../frontend/e2e/README.md)의 전용 DB·포트 방식으로 백엔드와 프론트를 띄워 e2e를 실행하고, 공개 메뉴 화면에 변경이 보이는지 브라우저에서 확인한다.
   - 확인: `npm run typecheck && npm run lint && npm run build && npm run test:e2e`

## 브랜치·커밋

- 브랜치: `feature/admin-category-frontend`(PR 1), `feature/admin-menu-frontend`(PR 2). 둘 다 `develop`에서 분기한다.
- 커밋: 각 단계를 한 커밋. 예: `feat: 관리자 카테고리 화면 API 연결 추가`
- PR 대상은 `develop`, 머지는 사람이 한다. PR마다 변경 400줄 이하를 목표로 하고, 넘으면 단계 단위로 더 나눈다.

## 가정

- R1: 백엔드 호출은 서버에서만 한다. 브라우저가 백엔드를 직접 부르지 않으므로 CORS 설정은 추가하지 않는다. `API_ORIGIN`은 `NEXT_PUBLIC_` 없이 서버 전용이다.
- R1: 관리자 API는 백엔드 `SecurityConfig`에서 `hasRole("ADMIN")`과 CSRF로 보호된다. 프론트는 `requireRole("admin", ...)`으로 먼저 막고, `apiFetch`가 세션 쿠키를 전달한다.
- R1: 백엔드가 꺼지면 `apiFetch`의 `fetch`가 예외를 던지고 라우트 `error.tsx`가 받는다. `apiFetch`의 오류 변환은 이번에 바꾸지 않는다.
- R1: `apiFetch`는 `cache: "no-store"`로 호출한다. 변경 뒤 화면 갱신은 지금처럼 `revalidatePath`와 `redirect`로 한다.
- R2: ▲▼ 이동도 화면의 새 순서 전체를 `PUT /order`로 보낸다. 다른 관리자가 먼저 바꿔 `409`가 오면 안내 후 새로고침한다.
- R3: 목록 화면의 카테고리 필터 값은 이름이 아니라 숫자 ID다. 필터를 바꾸면 `page`를 제거한다.
- R4: 프론트 검증은 백엔드와 같은 규칙(slug 형식, 이름 80자, 설명 500자, 가격 1~1,000,000)을 쓰되 최종 판단은 백엔드 응답이다.
- R4: 이미지 주소를 비우면 `/images/menus/placeholder.svg`를 보낸다.
- R4: 온도 값 이름은 `ice` 대신 백엔드의 `supportsIced`에 맞춘다.
- R5: 경로의 ID가 숫자가 아니면 백엔드를 부르지 않고 404를 보여 준다.

## 참고

- 2026-10-26 확인: `app/_lib/api/client.ts`에 `apiFetch`·`ApiRequestError`가 있고(`API_ORIGIN`, 쿠키 전달, `no-store`), 공개 메뉴와 `admin/users`가 사용한다.
- 2026-10-26 확인: `admin/users/_lib/api.ts`의 `csrfHeaders()`가 `/api/v1/auth/csrf`에서 토큰을 받아 `admin/users/_actions.ts`의 PUT에 붙인다.
- 2026-10-26 확인: `admin/users/error.tsx`가 백엔드 연결 실패를 `StatePanel`로 보여 준다. S2의 `error.tsx`는 이 형태를 따른다.
- 2026-10-26 확인: Playwright가 설치되어 있고(`npm run test:e2e`), 시나리오 테스트는 `frontend/e2e/`에 둔다(FRONTEND.md 5-1).
- 2026-10-26 확인: 관리자 대시보드(`app/admin/page.tsx`)는 아직 `mockMenuRepository`를 읽는다.
- 2026-10-22 확인: `app/_lib/mock/uploads.ts`는 개발 환경에서만 `public/uploads/menus/`에 저장하고 `/uploads/menus/...`를 돌려준다. 백엔드 이미지 주소 규칙은 이 경로를 받지 않는다.
