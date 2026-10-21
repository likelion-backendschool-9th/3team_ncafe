# 삼다방 데이터베이스 설계 초안

기준: 2026-10-20 `origin/develop` (`3563407`, 주문·결제 페이지 PR #45 포함). 대상 DB는 PostgreSQL이다. 이 문서는 구현 전 데이터 계약이다. 테이블은 Spring Boot 배포 시 엔티티를 기준으로 생성·갱신한다.

## 1. 범위와 결정

| 영역 | 이번 설계에 포함 | 결정 |
| --- | --- | --- |
| 회원 | 가입, 로그인, 프로필 조회·수정, 관리자 목록·상세·정지·해제, 관리자 계정 생성 | 공개 가입은 고객만 가능하다. 관리자 계정은 상태 변경 대상에서 제외한다. 첫 관리자는 초기 설정 절차로 만들고, 이후 관리자가 다른 관리자를 생성한다. |
| 메뉴·카테고리 | 등록·조회·수정·숨김, 검색·필터·정렬, 카테고리 순서 | 메뉴는 카테고리 하나에 속한다. 공개 메뉴 URL에는 고유한 `slug`를 쓴다. 카테고리 삭제 시 소속 메뉴를 `기타`로 옮긴다. |
| 장바구니·주문 | 회원별 장바구니 동기화, 주문, 관리자 상태 변경·취소, 고객 주문 조회 | 고객은 주문을 취소할 수 없다. 관리자는 `received`에서만 취소할 수 있다. 고객은 주문 목록·상세에서 취소 상태를 본다. |
| 뮤직박스 | 신청·삭제, 관리자 선곡·순서·재생·취소, 전체 카페의 현재 곡 | 카페 전체에 대기열과 현재 곡이 하나씩 있다. 재생 중인 신청곡은 회원이 삭제할 수 없다. 반복 모드는 없다. |
| 결제 | 후속 설계 | 주문 확정 시 결제 없이 `received`가 된다. 현재 카운터 결제수단 선택만 주문에 저장하며, 실제 결제 거래·상태와 결제사 연동은 흐름이 정해질 때 설계한다. |

기존 목 회원·메뉴·주문·신청곡·브라우저 장바구니는 이관하지 않는다. 초기 데이터는 보호된 `기타` 카테고리와 운영자가 설정하는 첫 관리자뿐이다. 세트 상품은 구성품 관계 없이 단일 메뉴로 취급한다.

현재 [WBS](https://docs.google.com/spreadsheets/d/14uSQMZDxGkvPw1hTfxbDsvIzxcyETHBFlY8h1oNOil0/edit?gid=0#gid=0)의 고객 주문 취소와 현재 곡 반복 모드는 제외한다. 관리자 주문 관리가 5번과 12번에 중복돼 있으므로 하나의 기능으로 정리한다. 관리자 주문 취소와 관리자 계정 생성은 작업 목록에 추가해야 한다.

## 2. ERD

### 개념 ERD — Chen 표기법

![Java 엔티티 이름으로 표기한 삼다방 Chen ERD](database-chen.svg)

[Chen ERD 크게 열기](database-chen.svg) · [그림 원본 열기](database-chen.dot)

이 문서의 주 도식은 Chen ERD다. 네모는 엔티티, 마름모는 관계, 타원은 속성이다. 밑줄 친 속성은 식별자이며 선의 `1`, `N`, `1..N`은 관계의 개수를 나타낸다. 업무 엔티티의 관계를 연결된 한 그림에 담았고 각 엔티티는 한 번씩 표시했다. 단일 잠금 행인 `MusicBoxState`는 다른 엔티티와 FK 관계가 없어 관계선 없는 별도 네모로 표시한다. 메뉴의 '첫 개시 표시 여부'와 '추천 표시 여부'는 화면 배지 설정이다. 장바구니의 체크 상태는 주문 화면에서만 쓰므로 저장 속성에서 제외했다. 주문 항목은 주문의 생성 시각을 공유하는 불변 스냅샷이다.

### 보조 Mermaid 관계도

다이어그램의 이름은 Java 엔티티명이다. DB 테이블은 각각 `User`→`users`, `Category`→`categories`, `Menu`→`menus`, `CartItem`→`cart_items`, `Order`→`orders`, `OrderItem`→`order_items`, `Song`→`music_requests`, `MusicBoxState`→`music_box_state`로 매핑한다. 속성은 DB 컬럼명으로 적었다.

```mermaid
erDiagram
    User ||--o{ CartItem : holds
    User ||--o{ Order : places
    User ||--o{ Song : submits
    Category ||--o{ Menu : contains
    Menu ||--o{ CartItem : referenced_by
    Order ||--|{ OrderItem : contains
    Menu ||--o{ OrderItem : source_of

    User {
      bigint id PK
      varchar email UK
      varchar password_hash
      varchar name
      varchar role
      varchar status
      timestamptz created_at
      timestamptz updated_at
    }
    Category {
      bigint id PK
      varchar name UK
      integer display_order
      boolean is_fallback
      timestamptz created_at
      timestamptz updated_at
    }
    Menu {
      bigint id PK
      bigint category_id FK
      varchar slug UK
      varchar name
      varchar description
      varchar image_url
      integer price
      boolean available
      boolean is_new
      boolean recommended
      boolean supports_hot
      boolean supports_iced
      timestamptz archived_at
      timestamptz created_at
      timestamptz updated_at
    }
    CartItem {
      bigint id PK
      bigint user_id FK
      bigint menu_id FK
      varchar temperature
      integer quantity
      timestamptz created_at
      timestamptz updated_at
    }
    Order {
      bigint id PK
      bigint customer_id FK
      varchar status
      varchar order_type
      varchar payment_method
      varchar request
      integer total_amount
      integer status_version
      varchar customer_name_snapshot
      timestamptz created_at
      timestamptz updated_at
    }
    OrderItem {
      bigint id PK
      bigint order_id FK
      bigint menu_id FK
      varchar menu_name
      varchar image_url
      varchar temperature
      integer unit_price
      integer quantity
      integer line_total
    }
    MusicBoxState {
      smallint id PK
      bigint revision
      timestamptz updated_at
    }
    Song {
      bigint id PK
      bigint user_id FK
      varchar requester_name
      varchar song_title
      varchar artist
      text story
      varchar status
      varchar youtube_video_id
      integer playlist_order
      timestamptz started_at
      integer duration_seconds
      timestamptz created_at
      timestamptz updated_at
    }
```

`music_box_state`는 신청곡의 부모 테이블이나 설정 테이블이 아니다. 단일 행을 잠가 재생·순서 변경을 직렬화하고, 변경 때마다 `revision`을 올려 화면 갱신 여부를 판별한다. 재생 중인 곡은 최대 한 건으로 제한한다.

## 3. 테이블 명세

주요 엔티티의 ID는 내부 식별용 `BIGINT GENERATED ... AS IDENTITY`를 기본으로 한다. `music_box_state.id`는 고정값 1이다. 손님용 메뉴 상세 조회만 `slug`를 사용한다. 금액은 원 단위 정수이며 음수는 허용하지 않는다. 시각은 `TIMESTAMPTZ`로 저장하고 API에서 ISO 8601로 반환한다.

### 회원과 카테고리

| 테이블 | 필수 컬럼 | 제약 및 읽기 방식 |
| --- | --- | --- |
| `users` | `id`, `email`, `password_hash`, `name`, `role`, `status`, `created_at`, `updated_at` | 이메일은 소문자 정규화 후 유일해야 한다. `role IN ('customer','admin')`, `status IN ('active','suspended')`. 정지된 회원은 새 로그인과 기존 세션의 회원 서비스 접근을 막는다. 관리자 계정의 정지·해제 API는 거부한다. 비밀번호 원문은 저장하지 않는다. |
| `categories` | `id`, `name`, `display_order`, `is_fallback`, `created_at`, `updated_at` | 이름 유일, 순서 유일. `is_fallback`은 카테고리 삭제 시 메뉴를 받을 단 하나의 `기타` 카테고리에서만 참이다. 그 밖의 카테고리는 모두 거짓이며, 메뉴별 이동 여부를 나타내지 않는다. `기타`의 이름 수정·삭제를 거부한다. 다른 카테고리를 삭제할 때 해당 메뉴를 `기타`로 옮기고 카테고리를 삭제하는 작업을 한 트랜잭션으로 처리한다. |

첫 관리자의 비밀번호는 소스·설정 파일에 넣지 않는다. 운영자가 제공한 비밀 값을 읽는 초기 설정 명령으로 만들고, 이후 관리자 전용 계정 생성 기능을 사용한다. 관리자 생성 API는 고객 공개 가입 API와 분리한다.

### 메뉴와 장바구니

| 테이블 | 필수 컬럼 | 제약 및 읽기 방식 |
| --- | --- | --- |
| `menus` | `id`, `category_id`, `slug`, `name`, `description`, `image_url`, `price`, `available`, `is_new`, `recommended`, `supports_hot`, `supports_iced`, `created_at`, `updated_at`; 숨김 시 `archived_at` | `category_id`는 필수 FK. `slug`는 소문자·숫자·하이픈만 허용하고 전체 메뉴에서 유일하다. 생성 후 변경하지 않는다. `name`은 화면에 표시하는 메뉴명이다. 영문 메뉴명은 저장하지 않으며 `slug`를 표시명 대신 사용하지 않는다. `price > 0`. `archived_at`이 있으면 손님 목록·신규 장바구니 추가에서 제외한다. 관리자가 메뉴를 삭제하면 `available=false`, `archived_at=now()`로 숨긴다. |
| `cart_items` | `id`, `user_id`, `menu_id`, `temperature`, `quantity`, `created_at`, `updated_at` | `user_id`가 장바구니 소유자다. 고객 계정만 담을 수 있도록 서비스에서 검사한다. 같은 회원의 `(menu_id, temperature)` 조합은 한 줄만 둔다. `temperature`는 `hot`, `iced`, `NULL` 중 하나이며 메뉴 옵션과 일치해야 한다. 수량은 1~20. 메뉴명·이미지·가격·판매 가능 여부는 현재 메뉴에서 조회하며 장바구니에 복제하지 않는다. |

장바구니는 회원별 `cart_items` 집합으로 표현한다. 장바구니의 내용과 수량만 기기 간 동기화한다. 체크박스의 주문 대상 선택은 화면 상태로 두고, 주문 요청에 이번에 주문할 `cart_item_id` 목록을 보낸다. 서버는 항목의 소유자를 확인한다. PostgreSQL에서는 `NULL` 온도 옵션의 중복도 막아야 한다. 구현 시 `NULLS NOT DISTINCT` 유니크 인덱스가 가능한 버전인지 확인하고, 아니면 `COALESCE(temperature, 'none')` 표현식 인덱스를 사용한다. 메뉴가 숨겨져도 기존 장바구니 줄은 주문 대상에서 제외하고 화면에 판매 중지를 보여준다.

메뉴 이미지 파일 자체는 파일 저장소에 두고 DB에는 접근 가능한 `image_url`을 저장한다. 온도 옵션은 `hot`과 `iced`로 표기하고 `supports_hot`, `supports_iced`로 표현한다. 현재 프론트의 `ice` 값은 API 연결 시 `iced`로 바꾼다. 화면의 태그는 '첫 개시'와 '추천 메뉴' 두 표시이므로 각각 `is_new`, `recommended`로 저장한다. 임의 태그를 만들거나 검색하는 기능은 현재 화면에 없다.

### 주문

| 테이블 | 필수 컬럼 | 제약 및 읽기 방식 |
| --- | --- | --- |
| `orders` | `id`, `customer_id`, `customer_name_snapshot`, `order_type`, `payment_method`, `request`, `status`, `total_amount`, `status_version`, `created_at`, `updated_at` | 상태는 `received`, `preparing`, `ready`, `completed`, `canceled`. `order_type`은 `dine-in` 또는 `takeout`, `payment_method`는 카운터에서 낼 `card` 또는 `cash` 선택이다. 실제 결제 상태나 거래 식별자는 저장하지 않는다. `request`는 주문 요청사항이며 최대 100자다. 취소 사유는 입력하지 않는다. 금액은 0 이상. 고객은 본인 주문만 조회한다. |
| `order_items` | `id`, `order_id`, `menu_id`, `menu_name`, `image_url`, `temperature`, `quantity`, `unit_price`, `line_total` | 주문 당시 데이터의 불변 스냅샷. `temperature`는 `hot`, `iced`, `NULL` 중 하나다. `quantity > 0`, `unit_price >= 0`, `line_total = quantity * unit_price`. `menu_id`는 과거 메뉴 추적용이며 메뉴 숨김 후에도 주문 조회는 스냅샷으로 가능해야 한다. |

한 주문에 여러 메뉴가 들어가므로 주문의 현재 상태·총액은 `orders`에 한 번만 두고, 메뉴별 수량·단가를 `order_items`에 둔다. 주문 항목은 주문과 함께 생성되고 이후 수정되지 않으므로 별도 생성·수정 시각은 두지 않는다.

주문 확정은 요청에 전달된 장바구니 항목 ID만 대상으로 한다. 서버가 항목의 소유권과 현재 메뉴의 판매 상태·온도 옵션·가격을 다시 확인하고, 클라이언트가 표시한 예상 총액과 다르면 주문을 만들지 않는다. 성공하면 주문·주문 항목을 저장하고 주문한 장바구니 줄만 제거한다. 전체 과정은 한 트랜잭션이다.

상태 이동은 `received ↔ preparing ↔ ready ↔ completed`에서 인접한 한 단계만 허용한다. `received → canceled`는 관리자만 가능하며 사유 입력 없이 이후 이동은 없다. 고객 취소 API는 제공하지 않는다. 변경 이력은 별도로 저장하지 않는다. 되돌리기는 현재 상태에서 이전 인접 상태로 바꾸며, `status_version`을 검사하고 증가시켜 다른 관리자의 선행 변경을 감지한다. 고객에게는 취소 상태를 보여준다. 취소 시각은 마지막 상태 변경인 `updated_at`으로 확인할 수 있다.

### 뮤직박스

| 테이블 | 필수 컬럼 | 제약 및 읽기 방식 |
| --- | --- | --- |
| `music_requests` | `id`, `user_id`, `requester_name`, `song_title`, `artist`, `story`, `status`, `created_at`, `updated_at` | 상태는 `pending`, `queued`, `playing`, `played`, `cancelled`. 선곡 전 `youtube_video_id`·`duration_seconds`는 `NULL` 가능. `queued`에서만 `playlist_order`를 사용한다. `playing`에는 `started_at`, `played`에는 `played_at`을 기록한다. 영상 길이는 0초 초과·6시간 이하. |
| `music_box_state` | `id=1`, `revision`, `updated_at` | 모든 선곡·재생 전환을 한 행 잠금 아래 처리한다. 화면의 버전 확인 API에는 `revision`을 반환한다. |

신청곡 작성은 로그인한 회원만 가능하며 `user_id`는 필수다. `requester_name`은 신청 당시 이름으로 남긴다. 회원은 본인의 곡 중 `playing`이 아닌 곡을 삭제할 수 있다. 관리자가 `pending`을 취소하면 삭제하지 않고 `cancelled`로 남긴다. `queued` 순서는 서로 겹치지 않게 하고, `playing`은 전체 DB에서 최대 한 건으로 제한한다. 재생 상태를 읽거나 바꿀 때 서버가 `started_at + duration_seconds`를 기준으로 경과한 곡을 정리하고 다음 곡의 시작 시각을 계산한다. 길이를 아직 모르면 재생 종료 통지 또는 관리자 조작을 기다린다. `serverNow`와 종료 예정 시각은 API 응답에서 계산하며 저장하지 않는다.

## 4. 인덱스와 동시성

- `users`: 정규화 이메일 유니크 인덱스. 회원관리 화면의 이름·이메일 검색, 역할·상태 필터, 페이지 이동은 DB 쿼리로 처리한다. 이름 부분 검색용 인덱스는 실제 데이터량과 쿼리 계획을 본 뒤 선택한다.
- `categories`: `(display_order)` 유니크, `is_fallback=true` 부분 유니크 인덱스로 기타 카테고리를 최대 한 개로 제한한다. 초기 설정에서 반드시 한 개를 만들고, 이후 `is_fallback` 변경·기타 삭제를 거부한다. 순서 재배치는 충돌 없이 처리되도록 한 트랜잭션에서 잠금과 임시 순서 또는 지연 가능한 제약을 사용한다.
- `menus`: `slug` 유니크, `(category_id, archived_at, available)` 조회 인덱스. 보관 처리된 메뉴의 slug도 재사용하지 않는다.
- `cart_items`: `(user_id, menu_id, temperature)`의 `NULL` 안전 유니크 인덱스. 장바구니 수정과 주문 확정은 해당 회원의 `users` 행을 잠가 기기 간 변경이 한 순서로 적용되게 한다. 읽을 때마다 서버의 현재 항목을 반환한다.
- `orders`: `(customer_id, created_at DESC)`, `(status, created_at DESC)` 인덱스. 상태 변경은 예상 상태·버전을 검사한 뒤 현재 상태와 버전을 함께 갱신한다.
- `music_requests`: `(status, playlist_order)` 조회 인덱스, `queued` 순서 유니크, `playing` 단일 행 보장용 부분 유니크 인덱스. 재생 상태 변경과 `revision` 증가를 한 트랜잭션에서 처리한다.

## 5. 프론트·API 변경 계약

1. 메뉴 등록 폼에 slug 입력·중복 검증을 추가하고 영문 메뉴명 입력·표시를 제거한다. slug는 URL 식별자이며 영문 표시명이 아니다. 고객 메뉴 상세 `/menus/{slug}`를 적용한다. 관리자 메뉴·장바구니·주문의 `menuId`와 회원·주문·신청곡 등의 경로 ID를 숫자 ID로 바꾸고, 메뉴 카테고리 선택은 하나로 제한한다. 프론트의 온도 값 `ice`를 `iced`로 통일한다.
2. 브라우저 `localStorage` 장바구니를 회원별 서버 장바구니 API로 바꾼다. 기존 목 장바구니는 이관하지 않으며 초기화한다. 장바구니 체크 상태는 서버에 저장하지 않고, 주문 요청에 선택된 장바구니 항목 ID를 보낸다. 가격·판매 상태는 조회 때 현재 메뉴와 결합한다.
3. 주문 페이지의 매장/포장, 카운터 결제수단, 요청사항을 주문 API에 연결한다. 고객 취소 버튼과 API는 제거한다. 관리자는 `received`에서만 사유 없이 취소할 수 있고, 고객 주문 목록·상세에는 취소 상태를 표시한다.
4. 새 관리자 회원관리 화면의 검색·필터·페이지 이동·고객 정지/해제를 DB 쿼리와 API로 연결한다. 관리자 생성 화면/API를 추가한다. 관리자 정지/해제는 현재 화면 규칙대로 거부한다.
5. 뮤직박스 API는 `startedAt`, `durationSeconds`, 현재 곡, 버전 정보를 제공한다. 자동 다음 곡 전환은 서버에서 보장하며 반복 모드 API는 만들지 않는다.

## 6. 구현 순서와 검증

1. 이 문서의 데이터 계약을 팀이 확인한 뒤 PostgreSQL 버전과 Spring Boot의 `ddl-auto=update`를 설정한다. 보호된 `기타`와 첫 관리자 생성 절차를 준비한다.
2. 회원·카테고리·메뉴 → 장바구니 → 주문 → 뮤직박스 순서로 엔티티와 API를 작은 PR로 만든다. 애플리케이션 시작 시 Hibernate가 JPA 엔티티에 대응하는 테이블을 생성·갱신한다. PostgreSQL 전용 제약은 JPA 자동 생성 범위 밖이므로 해당 기능을 구현할 때 적용 방법을 정한다. 결제 관련 테이블은 만들지 않는다.
3. 각 영역에서 FK/유니크/체크 제약, 트랜잭션, 권한을 검증한다. 특히 두 기기의 동일 장바구니 수정, 두 관리자의 주문 상태 변경, 동시 재생 시작을 확인한다.
4. 화면의 목 저장소를 API로 교체하고 빈 DB에서 관리자 생성 → 카테고리·메뉴 등록 → 장바구니 → 주문 → 선곡까지 확인한다. 기존 목 데이터 이관 스크립트는 만들지 않는다.

참조: `frontend/app/_lib/mock/{users,categories,menus,orders,music-box}.ts`, `frontend/app/_lib/cart/CartContext.tsx`, `frontend/app/_lib/orders/types.ts`, `frontend/app/admin/users/`, `backend/src/main/java/com/newcafe/backend/entity/Menu.java`, WBS.
