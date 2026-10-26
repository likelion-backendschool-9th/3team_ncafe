# 관리자 카테고리 화면 API 연결 계획

## 한눈에

- 끝나면: `/admin/categories`가 목 저장소 대신 백엔드 `admin/CategoriesController`를 읽고 쓴다. 관리자로 로그인해 추가·이름 수정·순서 변경·삭제한 결과가 DB에 남고, 공개 `/menus`의 카테고리 탭에도 보인다. `e2e/admin-categories.spec.ts`가 C1~C14를 확인한다.
- 결정 필요: 없음 (아래 가정으로 진행하고 PR에 적는다)
- 규모: 4단계, 약 3.5시간 (화면·컴포넌트 분리 2시간, e2e 1시간, 확인 30분)
- 현재 (10-26): 1단계 진행 중. 관리자 메뉴·카테고리 상위 계획([2026-10-22-frontend-admin-api.md](../menus/2026-10-22-frontend-admin-api.md))의 PR 1 3단계를 이 문서로 상세화한다. 상위 계획 1·2단계(`5c43520`, `7b4ddb2`)는 완료.
- 위치: `docs/admin/categories/`의 프론트 계획. 백엔드 계약은 [2026-10-21-backend-category-management.md](./2026-10-21-backend-category-management.md).

## 대상 쌍

| 페이지 | 주 컨트롤러 | 엔드포인트 (`/api/v1` 생략) |
| --- | --- | --- |
| `/admin/categories` | **`admin/CategoriesController`** | `GET`·`POST /admin/categories`, `PUT`·`DELETE /admin/categories/{id}`, `PUT /admin/categories/order` |

FRONTEND.md 2-2 매핑표 그대로다. 보조 컨트롤러는 없다.

## 1. 목록 (R1)

관리자는 백엔드 카테고리를 `displayOrder` 순서로 보고, 메뉴 수와 기타 카테고리 여부는 백엔드 값을 쓴다.

C1 정상
- Given 백엔드에 `커피(menuCount=2)`, `기타(isFallback=true, menuCount=0)`가 순서대로 있다.
- When 관리자가 `/admin/categories`를 연다.
- Then 두 줄이 그 순서로 보이고 `커피`는 "메뉴 2개에서 사용 중", `기타`는 "메뉴 0개에서 사용 중"이다.
- Then 제목은 `카테고리 관리 | 삼다방`이고, 개수 배지는 "2개"다.

C2 기타 카테고리 잠금
- Then `기타` 행의 수정·삭제 버튼은 `disabled`이고, 안내는 "삭제된 카테고리의 메뉴가 옮겨 가는 기타 카테고리라 수정·삭제할 수 없어요."다.

C3 권한
- Given 고객 계정으로 로그인했다.
- When `/admin/categories`를 연다.
- Then `/forbidden`으로 이동한다.

C4 백엔드 꺼짐
- Given 백엔드가 꺼져 있다.
- When `/admin/categories`를 연다.
- Then `error.tsx`가 "카테고리 정보를 불러오지 못했습니다"와 "다시 시도" 버튼을 보여 주고, 관리자 레이아웃의 다른 화면 이동 링크는 동작한다.

## 2. 추가 (R2)

새 카테고리를 추가하면 마지막 순서에 저장된다.

C5 정상
- When `" 차 "`를 입력하고 "카테고리 추가"를 누른다.
- Then 목록 마지막에 `차`가 보이고 입력란이 비며, 새로고침해도 유지된다.

C6 중복 이름
- Given `커피`가 있다.
- When `커피`를 추가한다.
- Then 입력란 아래에 "이미 존재하는 카테고리입니다."가 보이고 입력란에 `커피`가 남는다.

C7 입력 오류
- When 공백만 입력하거나 41자를 입력해 제출한다.
- Then 백엔드를 부르지 않고 입력란 아래에 "카테고리명은 1~40자로 입력해 주세요."가 보이며 `aria-invalid="true"`다.

## 3. 이름 수정 (R3)

C8 정상
- Given `차`가 있다.
- When `차`의 "수정"을 누르고 `녹차`로 바꿔 저장한다.
- Then 행이 읽기 상태로 돌아가 `녹차`가 보이고, 새로고침해도 유지된다.

C9 중복 이름
- Given `커피`, `녹차`가 있다.
- When `녹차`를 `커피`로 바꿔 저장한다.
- Then 행 아래에 "이미 존재하는 카테고리입니다."가 보이고 수정 상태가 유지된다.

## 4. 순서 변경 (R4)

▲▼와 드래그 모두 화면의 새 순서 전체 ID를 `PUT /order`로 보낸다.

C10 ▲ 이동
- Given 순서가 `[커피, 녹차, 기타]`다.
- When `녹차`의 ▲를 누른다.
- Then 화면이 즉시 `[녹차, 커피, 기타]`가 되고, 새로고침해도 `[녹차, 커피, 기타]`다.

C11 드래그
- When `기타`를 `녹차` 위로 끈다.
- Then 새로고침해도 `[기타, 녹차, 커피]`다.

C12 동시 변경
- Given 다른 창에서 카테고리 `디저트`를 추가했다.
- When 이 창에서 ▼를 누른다.
- Then 백엔드 `409` 메시지 "카테고리 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요."가 목록 위 `role="alert"`로 보이고, 목록은 서버 순서(`디저트` 포함)로 다시 그려진다.

## 5. 삭제 (R5)

삭제하면 그 카테고리의 메뉴는 백엔드가 기타 카테고리로 옮긴다.

C13 정상
- Given `커피`에 메뉴 2개가 있고 `기타`의 메뉴 수가 0이다.
- When `커피`의 "삭제"를 누르고 대화상자에서 "삭제"를 누른다.
- Then 대화상자가 닫히고 `커피`가 사라지며 `기타`는 "메뉴 2개에서 사용 중"이다.
- Then `/menus`의 카테고리 탭에서도 `커피`가 사라진다.

C14 이미 삭제됨
- Given 다른 창에서 `녹차`를 먼저 삭제했다.
- When 이 창에서 `녹차`를 삭제한다.
- Then 대화상자에 "카테고리를 찾을 수 없습니다."가 `role="alert"`로 보이고, 대화상자를 닫으면 목록에서 `녹차`가 사라져 있다.

## 범위 밖

- 관리자 메뉴 화면(`/admin/menus*`)의 카테고리 선택: 상위 계획 PR 2에서 연결한다. 그 전까지 메뉴 등록·수정 폼과 목록 필터는 목 카테고리를 보여 주므로, 이 화면에서 추가한 카테고리는 메뉴 폼에 나오지 않는다.
- `app/_lib/mock/categories.ts` 삭제: 관리자 메뉴 화면 4곳이 아직 쓴다. 상위 계획 PR 2 이후 정리한다.
- 관리자 대시보드(`/admin`) 집계.
- `apiFetch`의 네트워크 오류 변환(상위 계획 가정 R1).
- `e2e/session-auth.spec.ts` 수정.

## 작업 순서

1. 계획 문서 저장
   - 파일: 이 문서, 상위 계획 3단계에 이 문서 링크
   - 커밋: `docs: 관리자 카테고리 화면 연결 계획 추가`
2. 조회·변경을 API로 교체 — C1~C2, C5~C14
   - 파일:
     - `app/admin/categories/_lib/category.ts`: `CategoryResponse` 타입(`id: number`, `name`, `displayOrder`, `isFallback`, `menuCount`, `createdAt`, `updatedAt`)
     - `app/admin/categories/_lib/api.ts`: `getCategories()`. `admin/users/_lib/api.ts`처럼 응답 검증 후 정규화
     - `_actions.ts`: 5개 액션을 `apiFetch` + `csrfHeaders()`로. `moveCategory` 삭제, `reorderCategories`가 `{ error }`를 돌려줌. `try`는 API 호출만 감싸고 `ApiRequestError`만 상태로 돌려준다
     - `page.tsx`: 목 메뉴 집계 제거, `metadata` 추가. 이동 경로·제목·`CreateCategoryForm`·`CategoryListSection` 조립만 남긴다
     - `_components/CategoryListSection.tsx`(신규, 서버 컴포넌트): `page.tsx`에 있던 목록 `section`(제목, 개수 배지, 순서 안내, `CategoryList`/`EmptyState` 분기). `admin/users/_components/UserList.tsx`와 같은 역할
     - `_hooks/useCategoryOrder.ts`(신규): `CategoryList`의 순서 상태·서버 목록 동기화·드래그(`dragId`·`overId`)·▲▼ 이동·`reorderCategories` 호출·실패 메시지와 `router.refresh()` 되돌림
     - `_components/CategoryList.tsx`: 새 타입, `menuCounts`·`fallbackCategoryName` prop 제거, `useCategoryOrder`를 써서 행 렌더와 드래그 이벤트 연결, 실패 메시지는 목록 위 `role="alert"`
     - `_components/CategoryRow.tsx`: `locked={category.isFallback}`, `menuCount={category.menuCount}`, "기본 카테고리" → "기타 카테고리"
     - `_components/DeleteCategoryDialog.tsx`: `categoryId: number`, 실패 메시지 표시 후 닫으면 `router.refresh()`
     - `_components/CreateCategoryForm.tsx`: 실패 시 입력값 유지(`values`)
   - 확인: `cd frontend && npm run typecheck && npm run lint`, 백엔드를 띄워 C1·C5·C10·C13을 브라우저로 한 번 확인
   - 커밋: `feat: 관리자 카테고리 화면 API 연결 추가`
3. 로딩·오류 화면 — C3~C4
   - 파일: `app/admin/categories/loading.tsx`, `error.tsx` (`admin/users`의 `StatePanel` 형태)
   - 확인: 같은 명령 + 백엔드를 끄고 `/admin/categories`
   - 커밋: 2단계 커밋에 포함한다(라우트 규칙 5-1 충족이 같은 목적)
4. e2e — C1~C14
   - 파일: `frontend/e2e/fixtures/admin.ts`(가입 → 전용 DB에서 역할 변경 → 로그인), `frontend/e2e/admin-categories.spec.ts`(시나리오와 `test` 1:1, 이름에 `C번호`), `frontend/e2e/README.md`에 실행 대상 추가
   - 확인: `e2e/README.md` 방식으로 전용 DB·백엔드·프론트를 띄우고 `npm run test:e2e -- admin-categories`. C4는 백엔드를 끄는 시나리오라 e2e에서 빼고 브라우저로 확인한다
   - 커밋: `test: 관리자 카테고리 e2e 추가`

## 브랜치·커밋

- 브랜치: `feature/admin-category-frontend` (이미 있음, `origin/develop` 기준)
- 커밋: 위 3개 + 상위 계획의 2개. PR 대상은 `develop`, 머지는 사람이 한다.
- PR 제목: `feat: 관리자 카테고리 화면 API 연결 추가`. 변경이 400줄을 넘으면 e2e 커밋을 별도 PR로 나눈다.

## 가정

- R1: 카테고리 ID는 백엔드 Long을 `number`로 쓴다(FRONTEND.md 5-6). 목의 문자열 ID는 이 화면에서 쓰지 않는다.
- R1: 기타 카테고리 판별은 이름이 아니라 `isFallback`이다. 문구는 GLOSSARY의 "기타 카테고리"를 쓴다.
- R2·R3: 프론트 검증은 백엔드 `CategoryRequest`와 같은 규칙(앞뒤 공백 제거 후 1~40자)이다. 중복 검사는 백엔드 `409`에 맡긴다.
- R2·R3: 성공 뒤 갱신 경로는 `/admin/categories`와 `/menus`(layout)다. 상위 계획 PR 2 전까지 관리자 메뉴 화면은 목이라 갱신 대상에서 뺀다.
- R2: 추가 성공 뒤 `redirect` 대신 지금처럼 같은 화면에 머문다. 한 화면 안의 반복 작업이라 flash 쿼리를 쓰지 않는다(FRONTEND.md 5-6 6번의 예외로 PR에 적는다).
- R4: 순서 변경은 화면을 먼저 바꾸고 요청한다. 실패하면 메시지를 보여 주고 `router.refresh()`로 서버 순서를 다시 받는다. `400`(잘못된 ID)도 같은 방식이다.
- R5: `404`면 백엔드 메시지를 보여 주고, 닫을 때 목록을 새로 받는다. 기타 카테고리 `409`는 버튼이 잠겨 있어 화면에서 일어나지 않지만, 일어나면 메시지를 그대로 보여 준다.
- 컴포넌트: FRONTEND.md 5-1 "page는 조립만", 5-3 "`section` 단위 책임", "긴 상태 로직은 `_hooks/use*.ts`"에 따라 `CategoryListSection`과 `useCategoryOrder`만 분리한다. `CategoryRow`(84줄)·`DeleteCategoryDialog`(68줄)·`CreateCategoryForm`(22줄)은 책임이 하나이고 200줄 미만이라 나누지 않는다(5-3 "나중을 위한 추상화 금지").
- e2e: 관리자 계정은 `session-auth.spec.ts`의 방식(가입 → 전용 DB에서만 `role=admin` → 로그인)을 `e2e/fixtures/admin.ts`로 따로 만든다. 그 spec은 중간에 고객 상태를 확인하는 흐름이라 그대로 두고 수정하지 않는다.
- e2e: 전용 DB를 여러 번 돌려도 겹치지 않게 카테고리 이름에 실행마다 다른 접미사(`커피-<8자>`)를 붙인다. 메뉴 수 시나리오(C1·C13)의 메뉴는 `POST /api/v1/admin/menus`를 CSRF 헤더와 함께 호출해 만든다.

## 참고

- 2026-10-26 확인: 백엔드 `CategoriesController`는 `GET` 목록, `POST`(201), `PUT /{id}`, `PUT /order`(`{orderedIds}`), `DELETE /{id}`(204)를 제공한다. 응답은 `{id, name, displayOrder, isFallback, menuCount, createdAt, updatedAt}`이다.
- 2026-10-26 확인: `CategoriesService` 오류 메시지 — 중복 "이미 존재하는 카테고리입니다."(409), 순서 불일치 "카테고리 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요."(409), 잘못된 순서 "카테고리 순서에 중복되거나 잘못된 ID가 있습니다."(400), 기타 삭제 "기타 카테고리는 삭제할 수 없습니다."(409), 없음 "카테고리를 찾을 수 없습니다."(404).
- 2026-10-26 확인: `CategoryRequest`는 `@NotBlank`, `@Size(max = 40)`이고 `CategoryName.normalize`는 `trim()`만 한다.
- 2026-10-26 확인: 기타 카테고리는 백엔드 시작 시 `CategoryInitializer`가 만든다. e2e 전용 DB(`sql.init.mode=never`)에서도 생긴다.
- 2026-10-26 확인: `app/admin/categories`는 6개 파일 392줄이고, `mock/categories`를 이 화면 4곳과 관리자 메뉴 화면 4곳이 import한다.
- 2026-10-26 확인: `admin/users`에 `loading.tsx`·`error.tsx`(`StatePanel`)와 `metadata: { title: "회원 관리 | 삼다방" }`가 있다.
- 2026-10-26 확인: `CategoryRow.tsx:31`에 "기본 카테고리" 문구가 있다(FRONTEND.md 8-1 갭).
