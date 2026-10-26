# 기타 카테고리 맨 밑 고정 계획

## 한눈에

- 끝나면: 기타 카테고리가 항상 마지막 순서에 있다. 백엔드가 이 순서를 지키므로 관리자 `/admin/categories`와 공개 `/menus` 탭 모두 기타가 맨 밑(마지막 탭)에 보이고, 관리자 화면에서는 기타를 옮길 수 없다.
- 결정 필요: 없음 (10-26 사용자 답변: 백엔드 + 프론트 모두 적용)
- 규모: 5단계, PR 2개(백엔드 → 프론트), 약 2시간 (백엔드 1시간, 프론트 40분, e2e·확인 20분)
- 위치: `docs/admin/categories/`. 백엔드 [카테고리 계획](./2026-10-21-backend-category-management.md)의 R3 가정("기타도 순서를 바꿀 수 있다")과 R5를 바꾸고, [프론트 카테고리 계획](./2026-10-26-frontend-admin-categories.md)의 C5·C11을 바꾼다.

## 1. 백엔드: 기타는 항상 마지막 (R1)

`CategoriesService`가 모든 변경 뒤에 기타의 `displayOrder`를 가장 크게 유지하고, 기타가 마지막이 아닌 순서 요청은 거절한다.

B1 기존 데이터 정리
- Given 기타가 `displayOrder=1`, 커피가 `displayOrder=2`인 DB다.
- When 백엔드를 시작한다(`CategoryInitializer` → `initializeFallback`).
- Then 커피 `displayOrder=1`, 기타 `displayOrder=2`가 된다.

B2 재시작
- Given B1을 마친 DB다.
- When 백엔드를 다시 시작한다.
- Then 순서와 `updatedAt`이 바뀌지 않는다.

B3 등록
- Given 순서가 `[커피(1), 기타(2)]`다.
- When `POST /api/v1/admin/categories`에 `{"name":"차"}`를 보낸다.
- Then `201`과 `displayOrder=2`인 `차`를 돌려주고, 목록은 `[커피(1), 차(2), 기타(3)]`이다.

B4 순서 변경 정상
- Given 순서가 `[커피(10), 차(11), 기타(1)]`다.
- When `PUT /order`에 `{"orderedIds":[11,10,1]}`을 보낸다.
- Then `200`과 `[차, 커피, 기타]`를 돌려준다.

B5 기타가 마지막이 아닌 순서
- When `PUT /order`에 `{"orderedIds":[1,11,10]}`을 보낸다.
- Then `400`, `{"code":"INVALID_ORDER","message":"기타 카테고리는 항상 마지막에 있어야 합니다."}`를 돌려주고 순서는 그대로다.

B6 공개 카테고리
- Given 순서가 `[커피, 차, 기타]`다.
- When `GET /api/v1/menus/categories`를 호출한다.
- Then 기타가 마지막 항목이다.

## 2. 프론트: 기타는 옮길 수 없다 (R2)

관리자 화면은 기타를 맨 밑에 고정해 그리고, 순서를 저장할 때 기타 ID를 항상 마지막에 붙인다.

F1 기타 고정
- Given 순서가 `[커피, 차, 기타]`다.
- When `/admin/categories`를 연다.
- Then 기타가 마지막 행이고, 기타의 ▲▼는 `disabled`이며 기타 행은 `draggable`이 아니다.

F2 기타 위 행
- Then 기타 바로 위 행(`차`)의 ▼는 `disabled`다.

F3 기타 위로 끌기
- When `커피`를 기타 행 위로 끈다.
- Then 순서가 바뀌지 않고 순서 저장 요청을 보내지 않는다.

F4 추가 (프론트 C5 고침)
- When 카테고리 `녹차`를 추가한다.
- Then `녹차`가 기타 바로 위에 보이고, 새로고침해도 같다.

F5 공개 메뉴 탭
- When `/menus`를 연다.
- Then 카테고리 탭의 마지막이 `기타`다.

## 범위 밖

- 공개 `/menus` 화면 코드 수정: 백엔드 순서를 그대로 쓰므로 바꾸지 않는다.
- 기타가 메뉴 0개일 때 공개 탭에서 숨기기.
- 관리자 메뉴 화면의 카테고리 선택 순서: 상위 계획 PR 2.
- 백엔드 DB 제약(트리거 등)으로 강제하기: 서비스 규칙과 테스트로 지킨다.

## 작업 순서

### PR A — 백엔드 (`feature/category-fallback-last`, `origin/develop`에서 분기)

1. 계획 문서 저장
   - 파일: 이 문서, 백엔드 카테고리 계획의 R3 가정·R5에 `(고침 10-26: …)`
   - 커밋: `docs: 기타 카테고리 맨 밑 고정 계획 추가`
2. 서비스 규칙 — B1~B6
   - 파일: `backend/.../service/admin/CategoriesService.java`
     - `placeFallbackLast()`(private): 현재 목록에서 기타를 끝으로 옮긴 순서가 지금과 다를 때만 `saveOrderWithoutUniqueCollision`
     - `initializeFallback`: 기타가 이미 있으면 `placeFallbackLast()`(B1·B2)
     - `create`: 저장 뒤 `placeFallbackLast()`, 응답은 바뀐 `displayOrder`(B3)
     - `reorder`: 기존 검증 뒤 마지막 ID가 기타가 아니면 `INVALID_ORDER`(B5)
     - `delete`: 기존 재번호로 유지된다(변경 없음)
   - 파일: `CategoriesServiceTest.java`(B1·B2·B3·B5), `CategoriesControllerTest.java`(B5의 `400` 응답 형식)
   - 확인: `cd backend && ./gradlew test`
   - 커밋: `feat: 기타 카테고리를 항상 마지막 순서로 유지`

### PR B — 프론트 (`feature/admin-category-frontend`, PR A 머지 후 rebase)

3. 화면 고정 — F1~F3
   - 파일: `_hooks/useCategoryOrder.ts`(옮길 수 있는 목록 = 기타 제외, 저장 시 `[...옮긴 목록, 기타]`, 기타 위로의 drop 무시), `_components/CategoryList.tsx`(기타 행 `draggable={false}`, ▲▼ `disabled`, 기타 위 행의 ▼ `disabled`), `CategoryRow.tsx`(▲▼ 잠금 prop)
   - 확인: `cd frontend && npm run typecheck && npm run lint`
4. e2e — F1~F5
   - 파일: `e2e/admin-categories.spec.ts`(C5를 F4로 고치고 F1~F3·F5 추가)
   - 확인: 전용 DB에서 `npm run test:e2e -- admin-categories` 2회
   - 커밋: `feat: 관리자 카테고리 화면에서 기타 카테고리 고정` (3·4단계)
5. 프론트 계획 문서 고침
   - 파일: `2026-10-26-frontend-admin-categories.md`의 C5·C11에 `(고침 10-26: …)`, 가정에 기타 고정 추가
   - 4단계 커밋에 포함한다

## 브랜치·커밋

- PR A: `feature/category-fallback-last` → `develop`. 제목 `feat: 기타 카테고리를 항상 마지막 순서로 유지`
- PR B: 기존 `feature/admin-category-frontend`에 커밋을 더한다. PR A가 먼저 머지되어야 한다(본문에 적는다). PR A 전에는 B5 때문에 순서 저장이 실패하지 않지만, 새 카테고리가 기타 아래에 생긴다.
- 머지는 사람이 한다. 백엔드 계약 변경이라 PR A 본문에 프론트 담당자 리뷰 요청을 적는다(FRONTEND.md 2-1 5번).

## 가정

- R1: 기타의 위치 규칙은 "가장 큰 `displayOrder`"다. 기타 외 카테고리의 상대 순서는 그대로 둔다.
- R1: 기존 DB(팀 `ncafedb` 포함)는 백엔드 시작 시 B1으로 한 번 정리된다. 별도 마이그레이션 SQL은 만들지 않는다. 정리 뒤 순서는 기타 외 항목의 기존 상대 순서를 유지한다.
- R1: B5의 오류 코드는 기존 잘못된 순서와 같은 `INVALID_ORDER`(400)를 쓴다. 프론트는 기타를 항상 마지막에 붙이므로 정상 화면에서는 일어나지 않는다.
- R1: `create`의 응답 `displayOrder`는 정리 뒤 값이다. 다른 항목(기타)의 순서가 바뀌는 부작용은 목록 재조회로 반영한다.
- R2: 기타 행은 순서 번호(`01`…)도 마지막 번호로 보인다.
- R2: 기타의 ▲▼는 숨기지 않고 `disabled`로 둔다. 다른 행과 줄이 맞고, 기존 수정·삭제 잠금과 같은 방식이다.

## 참고

- 2026-10-26 확인: `CategoriesService.nextOrder()`는 최대 `displayOrder + 1`을 써서 새 카테고리를 기타 뒤에 붙인다. `initializeFallback`은 빈 DB에서 기타를 `displayOrder=1`로 만든다.
- 2026-10-26 확인: `reorder`는 개수·중복·누락만 검사하고 기타 위치는 검사하지 않는다. `delete`는 남은 목록을 `saveOrderWithoutUniqueCollision`으로 1부터 다시 매긴다.
- 2026-10-26 확인: 공개 `MenusService`(39번 줄)도 `findAllByOrderByDisplayOrderAsc`로 카테고리를 돌려주므로 백엔드 순서가 공개 탭 순서다.
- 2026-10-26 확인: 백엔드 카테고리 계획 R3 가정은 "기타는 일반 카테고리와 함께 순서를 바꿀 수 있다"이고, S15 예시는 이미 기타가 마지막이다.
- 2026-10-26 확인: `CategoriesServiceTest`(176줄, Mockito)와 `CategoriesControllerTest`(196줄, MockMvc)가 있다.
