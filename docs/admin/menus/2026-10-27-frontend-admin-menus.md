# 관리자 메뉴 화면 API 연결 계획

## 한눈에

- 끝나면: `/admin/menus`(목록), `/new`(등록), `/[id]`(상세), `/[id]/edit`(수정)가 목 저장소 대신 백엔드 메뉴 API를 읽고 쓴다. 관리자로 메뉴를 등록·검색·수정·삭제하면 DB와 공개 `/menus`에 바로 반영되고, e2e로 확인할 수 있다.
- 결정 필요: 없음 (아래 가정으로 진행)
- 현재 (10-27): 1~5단계 완료. 전용 DB 컨테이너에서 e2e 21개(M1~M20, M22, M23; M16·M17은 한 테스트)와 카테고리 e2e 16개가 함께 2회 연속 통과했다. 서버 검증 오류 뒤 select 값이 초기화되는 문제를 찾아 `fix` 커밋으로 고쳤다.
- 규모: 6단계, PR 1개, 약 4시간 (공통화 20분, 목록 1시간, 폼 1시간 20분, 상세·삭제 30분, e2e·확인 50분)
- 위치: [상위 계획](./2026-10-22-frontend-admin-api.md) PR 2(4~7단계)의 상세. 백엔드 계약은 [메뉴 백엔드 계획](./2026-10-22-backend-menu-management.md)을 따른다. 시나리오 번호 옆 괄호는 상위 계획 번호다.

## 1. 메뉴 목록 (R1)

목록의 검색어·카테고리·상태·정렬·페이지를 URL 쿼리로 받아 `GET /api/v1/admin/menus`에 넘기고, 응답 한 페이지(20개)를 표로 그린다.

M1 정상 (S1)
- Given 백엔드에 `아메리카노(커피, 4500원, 판매 중)`가 있다.
- When `/admin/menus`를 연다.
- Then 표에 `아메리카노` 한 줄이 slug `americano`, 카테고리 `커피`, `4,500원`, `판매 중`과 함께 보이고, 제목은 "메뉴 관리 | 삼다방"이다.

M2 검색·필터 (S8)
- Given `아메리카노(커피, 판매 중)`, `카페라떼(커피, 판매 중지)`, `모나카(다과)`가 있다.
- When 메뉴명 `라떼`, 카테고리 `커피`, 상태 `판매 중지`로 검색한다.
- Then 주소가 `?q=라떼&categoryId=<커피 id>&status=unavailable`로 시작하고 `카페라떼` 한 줄만 보인다. (고침 10-27: GET 폼이라 기본 정렬 `sort=newest`도 붙는다)

M3 slug 검색
- When 메뉴명 칸에 `americano`로 검색한다.
- Then `아메리카노`가 보인다.

M4 정렬 (S9)
- When 정렬을 `가격 높은순`으로 바꿔 검색한다.
- Then 주소에 `sort=price-high`가 붙고 가격 내림차순으로 보인다.

M5 페이지 (S10)
- Given 이 테스트가 만든 메뉴 25개만 검색어로 걸린다.
- When 목록을 열고 `다음 →`을 누른다.
- Then 첫 화면(API `page=0`)에 20줄과 `1 / 2`, 다음 화면(`?q=…&page=2`, API `page=1`)에 5줄과 `2 / 2`가 보이고 검색어는 유지된다.

M6 잘못된 쿼리
- When `/admin/menus?categoryId=abc&status=x&sort=y&page=-1`을 연다.
- Then 오류 없이 전체·최신순·1페이지 목록이 보인다.

M7 빈 결과
- When 걸리는 메뉴가 없는 검색어로 검색한다.
- Then "조건에 맞는 메뉴가 없습니다"와 "전체 메뉴 보기" 링크가 보인다.

## 2. 메뉴 등록 (R2)

등록 폼은 slug·카테고리 하나·핫/아이스를 백엔드 `MenuCreateRequest` 형식으로 보내고, 성공하면 목록으로 이동한다.

M8 정상 (S12)
- Given `커피` 카테고리가 있다.
- When slug `americano-<접미사>`, 메뉴명 `아메리카노`, 카테고리 `커피`, 설명, 가격 4500, 핫·아이스를 넣고 "메뉴 등록"을 누른다.
- Then `/admin/menus?created=<id>`로 이동해 "메뉴가 등록되었습니다"와 새 줄이 보인다.

M9 온도 없음·기본 이미지 (S13)
- When 핫·아이스를 모두 끄고 이미지 주소를 비운 채 `모나카`를 등록한다.
- Then 등록되고, 상세에서 온도 "온도 구분 없음"과 `/images/menus/placeholder.svg` 이미지가 보인다.

M10 입력 오류 (S14)
- When slug `Ameri Cano`로 등록한다.
- Then slug 입력란 아래에 "slug는 소문자·숫자·하이픈만 사용할 수 있습니다."가 보이고 입력한 값이 모두 남아 있다. 백엔드는 부르지 않는다.

M11 가격 범위 (S14)
- When 가격 `0`, `1000001`로 각각 등록한다.
- Then 가격 입력란 아래에 "가격은 1~1,000,000원으로 입력해 주세요."가 보인다.

M12 slug 중복 (S15)
- Given slug `americano-<접미사>` 메뉴가 있다.
- When 같은 slug로 등록한다.
- Then 백엔드 `409` 메시지 "이미 사용 중인 slug입니다."가 slug 입력란 아래에 보인다.

M13 사라진 카테고리
- Given 등록 폼을 연 뒤 다른 창에서 선택할 카테고리를 삭제했다.
- When 그 카테고리로 등록한다.
- Then 백엔드 `400` 메시지 "존재하지 않는 카테고리입니다."가 카테고리 입력란 아래에 보인다.

M14 업로드 숨김 (S16)
- When 등록·수정 폼을 연다.
- Then 이미지 파일 입력은 없고 이미지 주소 입력만 있다. 영문 메뉴명 입력도 없다.

## 3. 메뉴 상세·수정 (R3)

상세·수정은 숫자 ID로 `GET /api/v1/admin/menus/{id}`를 읽고, 수정은 `PUT`으로 보낸다. slug는 바꿀 수 없다.

M15 상세 (S17)
- When 등록한 `아메리카노`의 `/admin/menus/<id>`를 연다.
- Then slug, 카테고리 `커피`, 온도 "핫, 아이스", `4,500원`, `판매 중`, 등록일·최근 수정일이 보인다.

M16 수정 (S18)
- When `/admin/menus/<id>/edit`에서 가격을 5000, 카테고리를 `다과`로 바꿔 저장한다.
- Then `/admin/menus/<id>?updated=1`로 이동해 "메뉴를 수정했습니다", `5,000원`, `다과`가 보인다.

M17 slug 읽기 전용
- When 수정 폼을 연다.
- Then slug는 `readonly` 입력란으로 보이고 저장 요청 본문에 slug가 없다.

M18 없음 (S19)
- When `/admin/menus/999999`, `/admin/menus/abc`, 삭제한 메뉴의 상세·수정 주소를 연다.
- Then Next의 404 화면이 보인다. `abc`는 백엔드를 부르지 않는다.

## 4. 메뉴 삭제 (R4)

삭제 버튼은 확인 후 `DELETE /api/v1/admin/menus/{id}`(숨김)를 부른다.

M19 정상 (S20)
- When 목록이나 상세에서 `아메리카노`를 삭제하고 확인한다.
- Then `/admin/menus?deleted=1`로 이동해 "메뉴를 삭제했습니다"가 보이고 목록과 공개 `/menus`에서 사라진다.

M20 이미 삭제됨 (S21)
- Given 다른 창에서 같은 메뉴를 먼저 삭제했다.
- When 이 창의 목록에서 삭제한다.
- Then `/admin/menus?missing=1`로 이동해 "이미 삭제되었거나 존재하지 않는 메뉴입니다"가 보인다.

M21 삭제 실패
- Given 백엔드가 `404` 외의 오류를 돌려준다.
- When 상세에서 삭제한다.
- Then `/admin/menus/<id>?deleteError=1`로 이동해 "메뉴를 삭제하지 못했습니다. 다시 시도해 주세요."가 보인다. (e2e 없이 화면 코드로만 둔다)

## 5. 권한·변경 반영 (R5)

M22 고객 차단
- Given 고객으로 로그인했다.
- When `/admin/menus`, `/admin/menus/new`를 연다.
- Then `/forbidden`으로 이동한다.

M23 공개 메뉴 반영
- When 관리자 화면에서 메뉴를 등록하고 이름을 바꾼다.
- Then 공개 `/menus`를 새로 열면 바뀐 이름이 보인다.

## 범위 밖

- 백엔드 꺼짐 화면(상위 S2): `proxy.ts`의 세션 확인이 먼저 503을 던져 라우트 `error.tsx`까지 오지 않는다([카테고리 계획](../categories/2026-10-26-frontend-admin-categories.md) C4와 같음). `error.tsx`는 만들되 e2e는 하지 않는다.
- 관리자 대시보드(`/admin`)의 메뉴 수, 장바구니·주문의 목 메뉴(`app/_lib/orders/types.ts`, `OrderPanel.tsx`): 목 저장소를 계속 쓴다. `app/_lib/mock/menus.ts`는 지우지 않는다.
- 이미지 파일 업로드: `app/_lib/mock/uploads.ts`는 지우지 않고 폼에서만 뺀다.
- 페이지 크기 선택: 20개 고정.

## 작업 순서

1. 계획 문서 저장 — 전체
   - 파일: 이 문서, 상위 계획 PR 2 줄에 이 문서 링크
   - 커밋: `docs: 관리자 메뉴 화면 연결 계획 추가`
2. 카테고리 조회 공통화 — M2, M8 준비
   - 파일: `app/admin/categories/_lib/api.ts`·`category.ts`를 `app/admin/_lib/categories/`로 옮기고 카테고리 화면 import를 바꾼다. 두 번째 사용처(메뉴)가 생겨 공통 부모로 올리는 FRONTEND.md 5-1 규칙이다.
   - 확인: `cd frontend && npm run typecheck && npm run lint`
   - 커밋: `refactor: 관리자 카테고리 조회를 공통 위치로 이동`
3. 목록 — M1~M7
   - 파일: `app/admin/menus/_lib/menu.ts`(타입·상수·검증 규칙), `_lib/api.ts`(`getMenus`, `getMenu`, 응답 검증, page 변환), `_lib/searchParams.ts`(`parseMenuSearchParams`, `menuListQuery`, `parseMenuId`), `page.tsx`(metadata, 카테고리 필터 `categoryId`), `error.tsx`, `_components/MenuTable.tsx`(영문명 → slug, 카테고리 하나), `_components/MenuPagination.tsx`
4. 등록·수정 폼, 상세·삭제 — M8~M21
   - 파일: `_actions.ts`(`apiFetch` + `csrfHeaders()`, 프론트 검증을 백엔드 규칙에 맞춤, `409`→slug, `400` 카테고리 메시지→카테고리, 그 외→폼 메시지), `_components/MenuForm.tsx`(영문명·파일 입력 제거, slug 추가·수정 시 readonly, 카테고리 단일 선택 ID 값, 온도 선택 없음 허용), `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`
   - 확인: `npm run typecheck && npm run lint && npm run build`
   - 커밋: `feat: 관리자 메뉴 화면 API 연결 추가` (3·4단계)
5. e2e — M1~M20, M22, M23
   - 파일: `frontend/e2e/admin-menus.spec.ts`, 필요하면 `e2e/fixtures/admin.ts`에 메뉴 생성 도우미, `e2e/README.md` 한 줄
   - 확인: 전용 DB 컨테이너에서 `npm run test:e2e -- admin-menus admin-categories` 2회 연속 통과
   - 커밋: `test: 관리자 메뉴 e2e 추가`
6. 문서 정리 — 진행 현황
   - 파일: `docs/FRONTEND.md` 3장 `/admin/menus` 쿼리 줄(`category`→`categoryId`, `page` 추가), 8장 진행 현황, 이 문서 `한눈에`에 결과
   - 커밋: `docs: 관리자 메뉴 연결 현황 반영`

## 브랜치·커밋

- 브랜치: `feature/admin-menu-frontend` (`origin/develop` `ecd3c53`에서 분기)
- 커밋 5개: 1단계 docs, 2단계 refactor, 3·4단계 feat, 5단계 test, 6단계 docs
- PR: `feat: 관리자 메뉴 화면 API 연결 추가` → `develop`. 머지는 사람이 한다.

## 가정

- R1: 카테고리 필터 쿼리 이름은 백엔드와 같은 `categoryId`(숫자)다. 기존 `category`(이름) 주소는 무시한다. 필터·정렬을 바꿔 검색하면 `page`는 빠진다.
- R1: 검색어는 메뉴명과 slug에 걸린다(백엔드 `adminSearch`). 입력란 placeholder를 "메뉴명 또는 slug"로 바꾼다.
- R1: `created` 알림은 숫자 ID일 때만 보이고, 목록 첫 페이지에 그 메뉴가 있으면 줄을 강조한다. 페이지를 넘기면 강조는 없다.
- R1: 카테고리 필터와 폼의 선택지는 관리자 카테고리 API 순서(기타 마지막)를 그대로 쓴다.
- R2: 프론트 검증은 백엔드와 같은 규칙(slug `^[a-z0-9]+(-[a-z0-9]+)*$` 100자, 이름 80자, 설명 500자, 이미지 주소 `https://` 또는 `/images/menus/…`, 가격 1~1,000,000)이고, 최종 판단은 백엔드 응답이다. 메시지는 백엔드 문구를 쓴다.
- R2: 이미지 주소를 비우면 `/images/menus/placeholder.svg`를 보낸다. 핫·아이스를 모두 끄면 "온도 구분 없음" 메뉴다(백엔드가 허용).
- R3: 수정 폼의 카테고리 선택지에는 현재 메뉴 카테고리가 항상 있다(삭제된 카테고리의 메뉴는 기타로 옮겨지므로). "기존 분류" 표시는 없앤다.
- R3: 상세·수정 주소의 ID가 양의 정수가 아니면 백엔드를 부르지 않고 `notFound()`다. 백엔드 `404`도 `notFound()`다.
- R4: 삭제 확인은 지금처럼 `window.confirm`이다. 성공 뒤 갱신 경로는 `/admin`, `/admin/menus`, `/admin/categories`(메뉴 수), `/menus`(layout)다.
- PR 크기: 400줄을 넘을 수 있다. 카테고리 PR(#87)과 같이 화면 코드와 e2e를 한 PR로 올린다(10-27 사용자 결정). 본문에 이유를 적는다.

## 참고

- 2026-10-27 확인: 백엔드 `MenusController`는 `GET`(목록 `q`·`categoryId`·`status`·`sort`·`page`·`size`), `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`(204)를 제공한다. 목록 응답은 `{items, page, size, totalElements, totalPages}`, 메뉴 응답은 `id, slug, name, description, imageUrl, price, categoryId, categoryName, available, isNew, recommended, supportsHot, supportsIced, createdAt, updatedAt`이다.
- 2026-10-27 확인: 백엔드 오류는 slug 중복 `409 CONFLICT`, 없는·숨긴 메뉴 `404 NOT_FOUND`, 없는 카테고리 `400 INVALID_INPUT`, Bean Validation `400 VALIDATION_ERROR`(첫 메시지 하나)다. `MenuUpdateRequest`에는 slug가 없다.
- 2026-10-27 확인: 지금 메뉴 화면은 `mockMenuRepository`·`mockCategoryRepository`를 쓰고, 영문명·여러 카테고리·파일 업로드·온도 하나 이상 필수 규칙이 있다. 목록에 페이지가 없다.
- 2026-10-27 확인: `admin/users`가 `_lib/api.ts`(응답 검증, page±1), `_lib/searchParams.ts`, `UserPagination`, `error.tsx` 형태를 쓴다. 메뉴는 이 형태를 따른다.
- 2026-10-27 확인: `e2e/fixtures/admin.ts`의 `loginAsAdmin`·`adminApi`와 `admin-categories.spec.ts`의 `createMenus`가 있어 e2e 준비에 쓴다.
