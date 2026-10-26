# 회원 장바구니 프론트 연결 계획

## 한눈에

- 끝나면: 메뉴 상세의 담기와 `/cart`의 조회·수량 변경·삭제가 `localStorage` 대신 백엔드 장바구니 API(#81)를 쓴다. 다른 기기·새로고침에서도 장바구니가 유지되고, `CartContext`를 걷어낸다.
- 결정 필요: `/checkout`이 주문 대상 항목을 받는 방법 (아래 "결정 필요")
- 규모: 7단계
- 현재 (10-26): 계획 작성
- 위치: `docs/my/cart/`의 프론트 계획. 백엔드 계획은 `docs/my/cart/2026-10-25-backend-cart.md`.

## 기반 (develop에 머지됨)

| PR | 이 계획이 쓰는 것 |
| --- | --- |
| #81 장바구니 백엔드 | `POST /menus/{id}/cart/items`, `GET /cart/items`, `PUT`·`DELETE /cart/items/{id}`. 고객만(`hasRole("CUSTOMER")`), 변경 요청은 CSRF 필요 |
| #61 인증 | 세션 로그인, `getCurrentUser`·`requireRole`, `proxy.ts`의 `/cart`·`/checkout` 보호 |
| #77 공개 메뉴 프론트 | `/menus/[slug]`가 백엔드 메뉴(숫자 `id`, `slug`, `supportsHot`/`supportsIced`)를 쓰고 `OrderPanel`에 `menuId=String(id)`를 넘긴다 |
| #65 관리자 회원 화면 | 변경 요청 방식: `apiFetch`(`_lib/api/client.ts`) + 같은 세션의 CSRF 토큰(`admin/users/_lib/api.ts`의 `csrfHeaders()`) |

## 대상 쌍

| 페이지 | 주 컨트롤러 | 엔드포인트 (`/api/v1` 생략) |
| --- | --- | --- |
| `/cart` | `my/CartItemsController` | `GET /cart/items`, `PUT`·`DELETE /cart/items/{id}` |
| `/menus/[slug]` (보조, 2-3 예외 목록) | `my/CartItemsController` | `POST /menus/{id}/cart/items` |

## 1. 담기 (`/menus/[slug]`)

F1 정상
- Given 고객으로 로그인했고 `커피`(HOT·ICED)를 보고 있다.
- When `시원하게`, 수량 2로 `장바구니에 담기`를 누른다.
- Then Server Action이 `POST /menus/{id}/cart/items`에 `{"temperature":"iced","quantity":2}`를 보내고, 성공하면 기존 `CartAddedDialog`가 열린다.

F2 비로그인
- Then 지금처럼 `LoginRequiredDialog`가 열리고 `/login?next=/menus/{slug}`로 간다. API를 부르지 않는다.

F3 실패
- When 그사이 품절됐거나(`422`), 숨겨졌거나(`404`), 세션이 끝났다(`401`), 관리자 계정이다(`403`).
- Then 대화상자를 열지 않고 주문서 영역에 `role="alert"`로 서버 메시지를 보여 준다. `401`이면 로그인 대화상자를 연다.

## 2. 장바구니 (`/cart`)

F4 조회
- Then 서버 컴포넌트가 `GET /cart/items`로 받은 줄을 먼저 담은 순으로 보여 준다. 이름·사진·단가·온도(`HOT`/`ICE`)·수량·줄 합계, 주문할 수 없는 줄은 `품절된 메뉴입니다`.

F5 새로고침·다른 기기
- Then 같은 회원이면 어디서 열어도 같은 장바구니가 보인다.

F6 수량 변경·삭제
- When `+`/`−`나 `삭제`를 누른다.
- Then Server Action이 `PUT`/`DELETE`를 보내고 `/cart`를 다시 그린다. 처리 중에는 그 줄의 버튼을 막는다. 실패하면 `role="alert"`로 알린다(`404`면 "이미 삭제된 항목입니다").

F7 주문 대상 선택
- Then 체크 상태는 서버에 저장하지 않고 화면 `useState`로 둔다(DB 설계). 처음에는 주문 가능한 줄이 모두 선택되고, 선택 합계는 화면이 계산한다. 주문할 수 없는 줄은 선택할 수 없다.

F8 빈 장바구니
- Then 기존 빈 화면과 `메뉴 담으러 가기` 링크를 보여 준다.

F9 주문하기
- When 선택한 줄로 `주문하기`를 누른다.
- Then 아래 "결정 필요"의 방식으로 `/checkout`에 주문 대상 `cartItemIds`를 넘긴다. 이동은 `Link`(8-2 갭: `router.push`).

## 컴포넌트 분리

FRONTEND.md 5-3(서버/클라이언트 경계 우선, 반복 단위·독립 책임으로 분리, 200줄 넘으면 검토, `"use client"`는 leaf에만)과 #65·#68의 분리 방식을 따른다. `page.tsx`는 조회와 조립만 한다.

`/cart` (지금은 `CartView` 하나가 화면 전체를 그리는 클라이언트 컴포넌트, 8-2 갭)

| 컴포넌트 | 종류 | 맡는 일 |
| --- | --- | --- |
| `page.tsx` | 서버 | `requireRole`, `GET /cart/items` 조회, `h1`. 비었으면 `EmptyCart`, 아니면 `CartView` |
| `EmptyCart` | 서버 | 빈 장바구니 안내와 `메뉴 담으러 가기` 링크 |
| `CartView` | 클라이언트 | 주문 대상 선택 상태(`useState`)만 가진다. 아래 세 컴포넌트를 조립 |
| `CartToolbar` | 클라이언트 | 전체 선택 체크박스, `n개 담음` |
| `CartItemRow` | 클라이언트 | 줄 하나: 선택 체크박스, 사진, 이름·온도 배지, 단가 또는 `품절된 메뉴입니다`, 줄 합계 |
| `CartQuantityControl` | 클라이언트 | `−`/`+`. 수량 변경 Server Action, 처리 중 버튼 막기, 실패 안내 |
| `RemoveCartItemButton` | 클라이언트 | `삭제`. 삭제 Server Action, 처리 중 막기, 실패 안내 |
| `CartSummary` | 클라이언트 | 선택 개수·선택 합계, `주문하기` `Link` |

`/menus/[slug]`의 `OrderPanel` (지금 210줄)

| 컴포넌트 | 맡는 일 |
| --- | --- |
| `OrderPanel` | 온도·수량 상태와 담기 Server Action 호출, 대화상자 열기. 조립만 |
| `TemperaturePicker` | 온도 선택(`fieldset`+`legend`, 지금의 `TemperatureIcon` 포함) |
| `QuantityStepper` | 수량 `−`/`+` (1~20) |

- 화면 모양과 CSS(`cart.module.css`, `menus.module.css`)는 바꾸지 않는다. 마크업을 옮기기만 한다.
- `CheckoutView`(224줄)는 `/checkout` 쌍의 일이라 나누지 않는다. 결정 A면 읽는 부분만 고친다.

## 결정 필요: `/checkout`이 주문 대상을 받는 방법

지금 `/checkout`은 `CartContext`에서 선택된 항목을 읽고, 주문 확정은 아직 목 주문 저장소를 쓴다(주문 API 연결 전). `CartContext`를 걷어내면 다른 방법이 필요하다. FRONTEND.md 6-2에도 "`/checkout` 주문 대상 조회"가 보류로 남아 있다.

| | A. URL로 넘기기 (추천) | B. `CartContext`를 남겨 두기 |
| --- | --- | --- |
| 방식 | `/checkout?cartItemIds=11,12`. `/checkout` 서버 컴포넌트가 `GET /cart/items`를 읽고 이 id만 고른다. 주문 API의 `cartItemIds`와 이름이 같다 | 서버 장바구니를 쓰면서 선택 상태만 `CartContext`로 `/checkout`에 넘긴다 |
| 새 API | 없음 | 없음 |
| 이 PR이 `/checkout`에서 고치는 것 | 화면이 읽는 곳만: `page.tsx`가 조회해 `CheckoutView`에 props로 넘기고 `useCart` 제거. 주문 확정 Server Action(`_actions.ts`)은 그대로 둔다 | 없음 |
| 남는 문제 | 주문 확정은 주문 API 연결 전까지 실패(#77부터 이미 실패 중) | 서버 데이터를 클라이언트 전역 상태에 복사(5-2 위반), 루트 layout 갭(8-1) 유지 |

A로 하면 `/checkout` 쌍과 겹치는 파일이 `checkout/page.tsx`, `CheckoutView.tsx` 두 개다. 착수 전에 `/checkout` 쪽 작업과 겹치지 않는지 확인한다.

## 작업 순서

1. 계획 문서 저장
   - 커밋: `docs: 회원 장바구니 프론트 연결 계획 추가`
2. 장바구니 요청기·타입
   - `admin/users/_lib/api.ts`의 `csrfHeaders()`를 `app/_lib/api/csrf.ts`로 올린다(두 번째 사용처, 5-1 "위로 올리는 시점"). `admin/users`는 새 위치를 import한다. 동작은 같다.
   - `app/(customer)/cart/_lib/types.ts`(백엔드 `CartItemResponse`·`CartItemsResponse`), `app/(customer)/cart/_lib/api.ts`(`server-only`, `apiFetch`로 조회·응답 검증)
3. 담기 — F1~F3
   - `app/(public)/menus/[slug]/_actions.ts`: `addCartItem(menuId, temperature, quantity)`. 첫 줄 `requireRole("customer", ...)`, 화면 온도 `ice` → API `iced`, `apiFetch` + `csrfHeaders()`, 실패는 `{ ok: false, message }`, 성공하면 `revalidatePath("/cart")`.
   - `OrderPanel`: `useCart().addItem` 대신 Server Action. 처리 중 버튼 막기, 실패 `role="alert"`. `TemperaturePicker`, `QuantityStepper`로 분리(위 "컴포넌트 분리").
4. `/cart` — F4~F9
   - 위 "컴포넌트 분리" 표대로 나눈다. `page.tsx`가 조회해 `CartView`에 props로 넘기고, `CartView`는 체크 상태만 `useState`.
   - `app/(customer)/cart/_actions.ts`: `changeCartItemQuantity`, `removeCartItem` (`requireRole` → API → `revalidatePath("/cart")`).
5. `/checkout` 연결 — 결정에 따라
   - A: `/cart`의 주문하기를 `Link href="/checkout?cartItemIds=…"`로, `checkout/page.tsx`가 장바구니를 조회해 `CheckoutView`에 넘긴다.
6. `CartContext` 제거
   - `app/_lib/cart/CartContext.tsx` 삭제, `app/layout.tsx`의 `CartProvider` 제거(8-1 갭).
   - `docs/FRONTEND.md`: `/cart` 비고 "현재 localStorage" 삭제, 1장 현재 상태, 8-1·8-2 갭 갱신.
   - 커밋: `feat: 장바구니 화면을 백엔드 API에 연결` (2~6단계)
7. 확인
   - `npm run lint`, `npm run typecheck`
   - 로컬 Docker PostgreSQL에 `develop` 백엔드를 띄우고, 테스트 계정(이름 `장바구니 테스트 회원`, `example.com` 이메일)으로 담기 → `/cart` 조회·수량·삭제 → 새로고침 후 유지 → 다른 브라우저(같은 계정)에서 같은 장바구니 → 비로그인 담기 → 로그인 이동을 브라우저에서 확인한다. 팀 DB(ncafedb)는 쓰지 않는다.

## 브랜치·커밋

- `feature/cart-frontend` (`origin/develop` 기준). PR 대상은 `develop`, 머지는 사람이 한다.

## 범위 밖

- 주문 확정(`POST /orders`)과 `/my/orders` 연결: `/checkout`·주문 쌍. 백엔드의 `/api/v1/orders`도 아직 `SecurityConfig`에 선언되지 않아 막혀 있다.
- 장바구니 개수 배지: 지금 헤더에 없다.
- 기존 `localStorage` 장바구니 이관: 하지 않는다(DB 설계 5장 2번). 남은 `ncafe_mock_cart` 키는 쓰지 않는다.

## 가정

- 온도: 화면 컴포넌트는 지금처럼 `hot`/`ice`를 쓰고, API 경계(`_actions.ts`, `_lib/api.ts`)에서 `iced`로 바꾼다. DB 설계 5장 1번("`ice`를 `iced`로 통일")은 화면 타입까지 바꾸는 일이라 `OrderPanel`·주문 화면을 함께 고칠 때 한다.
- 요청기: #65가 develop에 넣은 방식(`apiFetch` + `csrfHeaders()`)을 따른다. `apiFetch`는 브라우저의 세션 쿠키를 그대로 백엔드에 보내고, 같은 세션으로 CSRF 토큰을 받아 헤더에 붙인다. 인증용 `BackendSession`(#61)은 고치지 않는다.
- 관리자: 관리자는 장바구니를 쓰지 않는다(백엔드 `403`). 상세의 담기 버튼은 지금처럼 보이고, 누르면 서버 메시지를 보여 준다.

## 참고

- 2026-10-26 확인: `CartContext`는 `CartView`, `CheckoutView`, `OrderPanel`, 메뉴 상세 `page.tsx`, 루트 `layout.tsx`가 쓴다. 헤더 배지는 없다.
- 2026-10-26 확인: `/checkout`의 `createCustomerOrder`는 아직 `mockOrderRepository`를 쓴다. 프론트에서 `/api/v1/orders`를 부르는 곳은 없다.
- 2026-10-26 확인: `admin/users/_actions.ts`가 `apiFetch(..., { headers: await csrfHeaders() })`로 `PUT /admin/users/{id}`를 보낸다.
- 2026-10-26 확인: `_lib/api/client.ts`와 `_lib/api/backend-session.ts`가 모양이 다른 `ApiRequestError`를 각각 내보낸다. 장바구니는 `client.ts`의 것을 쓴다.
