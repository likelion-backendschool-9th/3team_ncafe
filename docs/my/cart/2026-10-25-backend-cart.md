# 회원 장바구니 백엔드 계획

## 한눈에

- 끝나면: 로그인한 고객이 `/api/v1/menus/{id}/cart/items`로 메뉴를 담고, `/api/v1/cart/items`로 장바구니를 조회·수량 변경·삭제할 수 있다. 장바구니는 기기와 상관없이 회원별로 서버에 남고, 단위·MockMvc·접근 정책 테스트가 통과한다.
- 결정 필요: 없음 (아래 가정으로 진행하고 PR에 적는다)
- 규모: 6단계
- 현재 (10-26): 1~5단계 완료. #61·#69가 머지된 `develop` 위로 옮겼다. 프론트 연결(6단계)은 별도 PR.
- 위치: `docs/my/cart/`의 백엔드 계획.

## 선행 PR (10-26 머지됨)

| PR | 담당 | 이 계획이 쓰는 것 |
| --- | --- | --- |
| #61 인증 | 배기현 | `SessionUserDetails`(`getId()`, `ROLE_CUSTOMER`·`ROLE_ADMIN`), `@AuthenticationPrincipal`, `SecurityConfig`의 경로별 접근 정책(나머지 `denyAll`), CSRF, `User`·`UserRepository`, 테스트용 `@WithSessionUser`, `ApiAccessPolicyTest` |
| #69 주문 | 오명석 | `entity/cartitem/CartItem`(`id`, `userId`, `menu`, `temperature`, `quantity`), `CartItemRepository`(`findOwnedForUpdate`, `deleteAllByIdInBatch`), 판매 중지 `MENU_UNAVAILABLE`·`422` 규칙 |

## 1. 담기 (R1)

고객은 메뉴 상세에서 온도와 수량을 골라 담는다. 같은 메뉴·같은 온도는 한 줄로 합친다.

S1 정상
- Given 판매 중인 `커피(id=1, HOT·ICED 지원)`가 있고 장바구니가 비어 있다.
- When `POST /api/v1/menus/1/cart/items`에 `{"temperature":"iced","quantity":2}`를 보낸다.
- Then `201`과 `menuId=1`, `temperature=iced`, `quantity=2`인 줄을 반환한다.

S2 같은 줄 합치기
- Given S1의 줄(`iced`, 2개)이 있다.
- When 같은 요청을 `quantity=19`로 보낸다.
- Then `200`과 `quantity=20`인 같은 줄을 반환한다 (최대 20개로 맞춤). 줄은 늘지 않는다.

S3 온도 없는 메뉴
- Given 온도 옵션이 없는 `모나카(id=8)`가 있다.
- When `{"temperature":null,"quantity":1}`로 담는다.
- Then `201`과 `temperature=null`인 줄을 반환한다. 다시 담으면 S2처럼 같은 줄에 합친다.

S4 입력 오류
- When `quantity`가 0·21·누락, `temperature`가 `warm`, 지원하지 않는 온도(`모나카`에 `hot`), 온도 지원 메뉴에 `null` 중 하나로 담는다.
- Then `400`과 `{code, message}`를 반환하고 저장하지 않는다.

S5 담을 수 없는 메뉴
- Given `id=999`는 없고 `id=6`은 숨긴 메뉴, `id=2`(`생칡즙`)는 판매 중지다.
- When 각각 담는다.
- Then `404`, `404`, `422`를 반환하고 저장하지 않는다.

## 2. 조회 (R2)

고객은 자기 장바구니를 현재 메뉴 정보와 함께 본다. 메뉴명·이미지·가격·판매 여부는 장바구니에 복사하지 않고 지금 메뉴에서 읽는다.

S6 정상
- Given 회원 A의 장바구니에 `커피 iced 2개(3500원)`, `모나카 1개(3000원)`가 있다.
- When 회원 A가 `GET /api/v1/cart/items`를 호출한다.
- Then `200`과 줄별 `id`, `menuId`, `slug`, `name`, `imageUrl`, `unitPrice`, `temperature`, `quantity`, `lineTotal`, `orderable`과 `totalQuantity=3`, `totalAmount=10000`을 먼저 담은 순으로 반환한다.

S7 가격 변경·판매 중지 반영
- Given S6 뒤 관리자가 커피를 4000원으로 바꾸고 모나카를 판매 중지했다.
- When 다시 조회한다.
- Then 커피 `unitPrice=4000`, `lineTotal=8000`, 모나카 `orderable=false`이고, `totalAmount`는 주문 가능한 줄만 더한 8000이다.

S8 숨긴 메뉴
- Given 담아 둔 메뉴를 관리자가 삭제(숨김)했다.
- When 조회한다.
- Then 줄은 남고 `orderable=false`다.

S9 회원 분리
- Given 회원 B의 장바구니에 다른 줄이 있다.
- When 회원 A가 조회한다.
- Then 회원 A의 줄만 반환한다.

## 3. 수량 변경 (R3)

S10 정상
- Given 회원 A의 줄 `id=11`이 2개다.
- When `PUT /api/v1/cart/items/11`에 `{"quantity":5}`를 보낸다.
- Then `200`과 `quantity=5`인 줄을 반환한다.

S11 실패
- Given 회원 B의 줄 `id=12`가 있다.
- When 회원 A가 `id=11`에 `quantity` 0·21을 보내고, `id=12`·`id=999`에 정상 값을 보낸다.
- Then `400`, `400`, `404`, `404`를 반환하고 저장된 값은 그대로다 (남의 줄도 없는 줄과 같은 `404`).

## 4. 삭제 (R4)

S12 정상
- When 회원 A가 `DELETE /api/v1/cart/items/11`을 호출한다.
- Then `204`를 반환하고 줄이 지워진다.

S13 실패
- When 회원 A가 회원 B의 `id=12`나 없는 `id=999`를 지운다.
- Then 둘 다 `404`를 반환한다.

## 5. 접근 정책 (R5)

#61은 선언하지 않은 경로를 모두 `denyAll`로 막는다. 새 Controller는 `SecurityConfig`에 정책을 함께 선언해야 한다(인증 5단계 문서).

S14 비로그인
- When 로그인하지 않고 R1~R4를 호출한다.
- Then `401`과 `UNAUTHENTICATED`를 반환하고 Service를 부르지 않는다.

S15 CSRF
- Given 고객으로 로그인했지만 CSRF 토큰이 없다.
- When R1·R3·R4를 호출한다.
- Then `403`과 `CSRF_INVALID`를 반환한다. R2(GET)는 CSRF 없이 `200`이다.

S16 관리자
- Given 관리자로 로그인했다.
- When R1~R4를 호출한다.
- Then `403`과 `FORBIDDEN`을 반환한다 (DB 설계: 고객 계정만 담는다).

S17 다른 메서드
- When `PATCH /api/v1/cart/items/11`, `GET /api/v1/menus/1/cart/items`를 호출한다.
- Then 선언하지 않은 경로라 `denyAll` 정책대로 거부한다.

## API 계약

| 요구사항 | 경로 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| R1 | `POST /api/v1/menus/{id}/cart/items` | `CartItemRequest` (`temperature`, `quantity`) | 새 줄 `201`, 합친 줄 `200`, 줄 |
| R2 | `GET /api/v1/cart/items` | 없음 | `200`, `CartItemsResponse` |
| R3 | `PUT /api/v1/cart/items/{id}` | `CartItemQuantityRequest` (`quantity`) | `200`, 줄 |
| R4 | `DELETE /api/v1/cart/items/{id}` | 없음 | `204` |

- 줄 응답 `CartItemResponse`: `id`, `menuId`, `slug`, `name`, `imageUrl`, `unitPrice`, `temperature`(`hot`·`iced`·`null`), `quantity`, `lineTotal`, `orderable`.
- 목록 응답 `CartItemsResponse`: `items`, `totalQuantity`, `totalAmount` (주문 가능한 줄만).
- 오류: 공통 `{code, message}`. 입력 오류 `400 VALIDATION_ERROR`, 비로그인 `401 UNAUTHENTICATED`, CSRF 누락 `403 CSRF_INVALID`, 관리자 `403 FORBIDDEN`, 없음·남의 줄·숨긴 메뉴 `404 NOT_FOUND`, 판매 중지 담기 `422 MENU_UNAVAILABLE`.
- 조회 응답은 `Cache-Control: no-store` (#61의 `GET /my`와 같은 규칙).

## 범위 밖

- 주문 대상 체크 상태 저장(WBS 14.5): DB 설계대로 화면 상태로 두고 주문 요청에 `cartItemIds`를 보낸다.
- 주문 확정 시 줄 제거: 주문 담당(#69)의 `my/OrdersService`가 한다.
- 로그인·세션·CSRF 구현: 인증 담당(#61). 장바구니는 `SessionUserDetails`를 쓰기만 한다.
- 비회원 장바구니, 기존 `localStorage` 장바구니 이관: 하지 않는다 (DB 설계 5장 2번).
- 프론트엔드 연결: 아래 작업 순서 6단계에서 별도 PR.

## 작업 순서

1. 계획 문서 저장 — 전체
   - 파일: `docs/my/cart/2026-10-25-backend-cart.md`
   - 커밋: `docs: 회원 장바구니 백엔드 계획 추가`
2. Entity·DTO·오류 — S1~S4의 입력 검증
   - `entity/cartitem/CartItem`: #69의 매핑은 그대로 두고 `createdAt`·`updatedAt`, `create(userId, menu, temperature, quantity)`, `addQuantity`(20 상한), `changeQuantity`를 추가한다.
   - `CartItemRepository`: #69 메서드는 그대로 두고 `findAllByUserIdOrderByIdAsc`(`menu` EntityGraph), `findByIdAndUserId`, `findByUserIdAndMenu_IdAndTemperature`, 온도 `null`용 `findByUserIdAndMenu_IdAndTemperatureIsNull`을 추가한다.
   - `UserRepository`: 회원 행 잠금 조회 `findByIdForUpdate`(`PESSIMISTIC_WRITE`) 추가.
   - `dto/cartitems/`: `CartItemRequest`, `CartItemQuantityRequest`(Bean Validation 1~20), `CartItemResponse`, `CartItemsResponse`.
   - `common/error/CartItemException`(`NOT_FOUND`, `INVALID_INPUT`, `MENU_UNAVAILABLE`)과 장바구니 전용 `CartItemsExceptionHandler`(`@RestControllerAdvice(assignableTypes = CartItemsController.class)`, #80 `AdminOrdersExceptionHandler`와 같은 방식). 공용 `ApiExceptionHandler`는 고치지 않는다.
   - 확인: `./gradlew compileJava`
3. 담기 — S1~S5
   - `service/my/CartItemsService` (`@Service("myCartItemsService")`). 모든 메서드가 `Long userId`를 받는다.
   - 변경(R1·R3·R4)은 먼저 `UserRepository.findByIdForUpdate(userId)`로 회원 행을 잠근다. 같은 회원의 동시 담기가 한 줄씩 차례로 적용되어 온도 `null` 줄도 중복이 생기지 않는다 (DB 설계 4장 잠금 규칙, 주문 확정과 같은 순서).
   - `controller/my/CartItemsController`: `@AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member`에서 `member.getId()`만 Service에 넘긴다.
   - 테스트: `service/my/CartItemsServiceTest`, `controller/my/CartItemsControllerTest`(standalone MockMvc + principal 주입)
   - 커밋: `feat: 장바구니 담기 API 추가`
4. 조회·수량 변경·삭제 — S6~S13
   - 커밋: `feat: 장바구니 조회·수정·삭제 API 추가`
   - 확인: `./gradlew test` 전체 통과
5. 접근 정책 — S14~S17
   - `SecurityConfig`: `GET /api/v1/cart/items`, `PUT`·`DELETE /api/v1/cart/items/*`, `POST /api/v1/menus/*/cart/items`를 `hasRole("CUSTOMER")`로 선언한다.
   - `ApiAccessPolicyTest`에 S14~S17을 추가한다 (`@WithSessionUser`, `csrf()`).
   - 인증 담당(배기현)에게 리뷰를 요청한다.
   - 커밋: `feat: 장바구니 API 접근 정책 추가`
   - 실제 DB 확인은 팀 DB(ncafedb)에 머지 전 테이블·계정을 만들지 않도록 #61과 같은 Testcontainers 통합 테스트로 한다. `integrationTest/CartItemsIntegrationTest`: 실제 로그인 세션·CSRF로 S1~S16 흐름, 다른 회원 `404`, 온도 없는 메뉴 동시 담기 8건이 한 줄로 합쳐지는지(회원 행 잠금) 확인한다.
   - 커밋: `test: 장바구니 PostgreSQL 통합 테스트 추가`
   - 확인: `./gradlew test integrationTest` (Docker 필요)
6. 프론트 연결 (별도 브랜치·PR)
   - `CartContext`·`localStorage`를 걷어내고 `/cart`를 서버 컴포넌트 조회로, 담기·수량·삭제를 Server Action으로 바꾼다. 체크 상태는 화면 `useState`.
   - 변경 요청에는 #61이 정한 CSRF 처리를 따른다. 공통 요청기는 `frontend/app/_lib/api/client.ts`.
   - 온도 값 `ice` → `iced`.
   - 확인: 메뉴 상세 → `/cart`에서 담기·수량·삭제·새로고침 후 유지.

## 브랜치·커밋

- 백엔드: `feature/cart-api` (1~5단계), 프론트: `feature/cart-frontend` (6단계). PR 대상은 `develop`, 머지는 사람이 한다.
- #61·#69가 머지되기 전에는 두 PR을 합친 로컬 임시 브랜치에서 개발·테스트했고, 10-26 머지 후 `origin/develop` 기준 `feature/cart-api`로 내 커밋만 옮겼다(cherry-pick).
- #61·#69 파일(`SecurityConfig`, `UserRepository`, `ApiAccessPolicyTest`, `CartItem`, `CartItemRepository`)은 기존 내용을 바꾸지 않고 추가만 한다. 인증 담당·주문 담당에게 리뷰를 요청한다.

## 가정

- R1: 합친 수량이 20을 넘으면 오류 대신 20으로 맞춘다. 현재 화면(`CartContext`)의 동작이다.
- R1: 판매 중지 메뉴 담기는 `422 MENU_UNAVAILABLE`. 주문 API(#69)와 맞춘다. 숨긴 메뉴는 손님에게 없는 메뉴라 `404`.
- R1: 온도 값은 `hot`, `iced`, `null`. 메뉴가 온도를 지원하면 지원 값 중 하나가 필수, 지원하지 않으면 `null`만 허용 (#69 `OrdersService.validateCartItem`과 같은 규칙).
- R1: 같은 줄 판단은 `(회원, 메뉴, 온도)`. 회원 행 잠금으로 한 회원의 변경이 직렬화되어 서비스 조회만으로 중복을 막는다. `NULL` 안전 유니크 인덱스(DB 설계 4장)는 `ddl-auto: update`로 만들 수 없어 스키마 관리 도구가 생기면 추가한다.
- R2: 줄 순서는 먼저 담은 순(`id` 오름차순). `orderable`은 메뉴가 판매 중이고 숨기지 않았을 때 `true`.
- R2: `totalAmount`는 주문 가능한 줄만 더한다. 화면이 체크한 줄만의 합계는 프론트가 계산한다.
- R3·R4: 남의 줄은 존재를 알리지 않도록 없는 줄과 같은 `404` (#69와 같은 규칙).
- 회원: `CartItem.userId`는 #69대로 숫자다. `users` FK 연결은 #69 매핑을 바꾸는 일이라 이번에 하지 않는다.
- 권한: 관리자는 장바구니를 쓰지 않는다 (DB 설계 `cart_items`: 고객 계정만). `SecurityConfig`의 `hasRole("CUSTOMER")`로 막는다.
- 정지 회원: #61의 `SessionMemberFilter`가 요청마다 회원 상태를 확인하므로 장바구니에서 따로 검사하지 않는다.

## 참고

- 2026-10-25 확인: #69(`feature/order-api`)의 `CartItem`은 `id`, `userId`, `menu`, `temperature`(길이 10), `quantity`만 매핑하고 CRUD가 없다. `CartItemRepository`에는 `findOwnedForUpdate`, `deleteAllByIdInBatch`가 있다. `OrdersService`는 온도를 `hot|iced`로 검사한다.
- 2026-10-25 확인: #61(`feature/session-auth`, b932c5a)의 `SecurityConfig`는 CSRF·가입·로그인·로그아웃을 허용하고, `GET /api/v1/my`에 인증, `/api/v1/admin/**`에 관리자를 요구하며, 나머지는 `denyAll`이다. `ApiAccessPolicyTest`가 경로별 정책을 검사한다.
- 2026-10-25 확인: #61의 `my/UsersController`는 `@AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails`로 회원 ID를 꺼내고 응답에 `Cache-Control: no-store`를 붙인다. 보안 오류 코드는 `UNAUTHENTICATED`(401), `CSRF_INVALID`·`FORBIDDEN`(403).
- 2026-10-25 확인: `docs/database-design.md`의 `cart_items` 제약(회원·메뉴·온도별 한 줄, 수량 1~20, 메뉴 정보 복제 안 함, 고객만)과 4장 잠금 규칙(장바구니 수정·주문 확정은 회원 행 잠금).
- 2026-10-25 확인: `frontend/app/_lib/cart/CartContext.tsx`는 최대 20개, 같은 메뉴·온도 합치기, 판매 중지 표시를 쓴다.
