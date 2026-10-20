# 삼다방 백엔드 청사진

## 한눈에

- 끝나면: `backend/`에서 Spring Boot API가 PostgreSQL을 사용하고, 회원이 메뉴 탐색 → 장바구니 → 매장/포장 주문 → 주문 확인을 하며 관리자가 이를 운영할 수 있다.
- 결정 필요: WBS의 실제 결제·고객 주문 취소·현재 곡 반복 모드를 후속 단계에서 구현할 때의 정책.
- 규모: 기반 구축 후 기능별로 API와 프론트 화면을 함께 연결한다.
- 기준: 2026-10-20에 읽은 [WBS `전체` 시트](https://docs.google.com/spreadsheets/d/14uSQMZDxGkvPw1hTfxbDsvIzxcyETHBFlY8h1oNOil0/edit?gid=0#gid=0)를 기능 목록의 우선 근거로, 같은 날짜의 [DB 설계](../../docs/database-design.md)를 이번 구현의 데이터·정책 기준으로 삼는다. 프론트엔드보다 WBS의 최신 항목을 우선한다.

## 먼저 확정할 질문

1. Q1 — WBS 7~8의 실제 결제와 결제수단 CRUD를 별도 단계로 진행할 때, 사용할 PG와 토큰화·환불 규칙은 무엇인가?
2. Q2 — WBS 6.2의 고객 주문 취소를 다시 포함할 때, 허용 상태와 이미 지불한 주문의 환불 규칙은 무엇인가?
3. Q3 — WBS 11의 반복 모드를 다시 포함할 때, 현재 곡 반복과 전체 목록 반복 중 무엇을 뜻하는가?
4. Q4 — PostgreSQL 스키마 변경을 어떤 방식으로 적용하고 버전을 관리할 것인가? DB 설계는 도구 선정을 구현 전 작업으로 남겨 두었다.

현재 DB 설계에 따라 주문 확정 시 실제 청구 없이 `received`가 된다. 주문서의 `card`/`cash`는 카운터에서 사용할 결제수단 선택값이다. 질문 1~3은 이번 기반·핵심 API 구현의 선행 조건이 아니다. Q4는 DB 테이블을 만들기 전에 정한다.

## 요구사항과 검증 시나리오

### R1. 실행 가능한 백엔드

`backend/`에 Java 21, Spring Boot 4.1.x, Gradle, PostgreSQL 기반 REST API 프로젝트를 만들고 JUnit 테스트를 실행할 수 있다.

S1 정상
- Given PostgreSQL의 빈 개발 DB와 환경 변수 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`가 있다.
- When `cd backend && ./gradlew test bootRun`을 실행한다.
- Then 테스트가 통과하고 API가 시작되며 DB 연결 오류가 없다.

S2 실패
- Given DB가 중지되어 있다.
- When 애플리케이션을 시작한다.
- Then 연결 실패가 로그에 드러나고 정상 시작으로 표시되지 않는다.

### R2. 회원과 권한

방문자는 회원가입·로그인·로그아웃을 하고, 회원은 자기 정보를 조회·수정하며, 관리자는 회원을 조회·상태 변경한다. (WBS 1.x, 2.x)

S3 정상
- Given 고객 계정 1개와 관리자 계정 1개가 있다.
- When 고객이 로그인해 `/api/v1/my`를 요청한다.
- Then 본인 정보만 반환한다.

S4 권한 실패
- Given 고객으로 로그인했다.
- When `/api/v1/admin/users`를 요청한다.
- Then 403을 반환한다.

### R3. 카테고리와 메뉴

관리자는 카테고리와 메뉴를 관리하고, 방문자는 공개 메뉴를 검색·필터·정렬·상세 조회하며 홈에서 추천 메뉴를 본다. (WBS 3.x, 4.x, 13.x)

S5 정상
- Given 관리자가 카테고리와 판매 중인 메뉴를 등록했다.
- When 방문자가 카테고리 필터로 메뉴 목록과 상세를 조회한다.
- Then 해당 메뉴의 가격·옵션·판매 상태를 확인할 수 있다.

S6 경계
- Given 주문 이력이 있는 메뉴다.
- When 관리자가 메뉴를 삭제한다.
- Then 공개 목록에서 제외되고 과거 주문 품목 정보는 유지된다.

### R4. 장바구니와 주문

회원은 메뉴를 장바구니에 담아 조회·수량 변경·삭제·품목 선택을 하고, 선택한 품목으로 주문을 생성·조회한다. 관리자는 주문을 검색·상세 조회·상태 변경·접수 상태에서 취소한다. (WBS 5.x/12.x, 6.1/6.3/6.4, 14.x; 6.2는 후속)

S7 정상
- Given 회원 장바구니에 3개 품목이 있고 2개를 선택했다.
- When 선택한 품목으로 주문한다.
- Then 서버가 현재 가격으로 2개 품목의 주문을 생성하고 해당 장바구니 품목만 제거한다.

S8 실패
- Given 같은 주문 요청이 다시 제출되었다.
- When 서버가 두 번째 요청을 처리한다.
- Then 중복 주문을 만들지 않고 이전 결과 또는 명시적 충돌 응답을 반환한다.

S9 권한 실패
- Given 회원 A의 주문이 있다.
- When 회원 B가 그 주문 상세 API를 호출한다.
- Then 주문 내용을 공개하지 않고 접근을 거부한다.

### R5. 주문서와 카운터 결제수단

회원은 주문서에서 매장/포장, 카운터 결제수단(`card`/`cash`), 요청사항을 선택하고 확인한다. 실제 PG 결제·결제수단 CRUD는 후속 설계다. (현재 DB 설계; WBS 7.x, 8.x는 후속)

S10 정상
- Given 회원이 장바구니에서 2개 품목을 선택했다.
- When 매장 식사·카드·요청사항을 입력해 주문을 확정한다.
- Then 실제 청구 없이 `received` 주문과 선택값을 조회할 수 있다.

S11 실패
- Given 요청사항이 100자를 넘거나 예상 금액이 서버 계산값과 다르다.
- When 주문을 확정한다.
- Then 주문을 만들지 않고 검증 또는 충돌 오류를 반환한다.

WBS의 결제 기능을 착수할 때 별도 결제 상태·거래 테이블과 중복 청구 방지 시나리오를 설계한다.

### R6. 뮤직박스

회원은 신청곡을 등록·조회·삭제하고 현재 곡을 확인한다. 관리자는 신청을 취소하고 재생 목록·순서·상태·현재 곡을 관리한다. 홈에도 신청곡 요약을 제공한다. (WBS 10.x, 11.x; 반복 모드는 후속)

S12 정상
- Given 대기 중인 신청곡 2개가 있다.
- When 관리자가 첫 곡을 재생 목록에 넣고 지금 재생한다.
- Then 공개 API의 현재 곡과 관리자 목록에 같은 곡·상태가 보인다.

S13 경계
- Given 곡이 재생 중이다.
- When 신청자가 삭제하거나 두 관리자가 동시에 다음 곡을 재생하려 한다.
- Then 삭제 규칙을 적용하고 동시에 재생 중인 곡은 최대 1개다.

## 기술 선택과 의존성

| 항목 | 선택 |
| --- | --- |
| 프로젝트 | `backend`, Gradle Wrapper, Groovy DSL, 실행형 JAR |
| Java | JDK 21 toolchain |
| Spring Boot | **4.1.1**로 시작. `4.1.x`의 확인된 안정 릴리스이며 패치 업그레이드는 별도 검증 후 진행 |
| DB | PostgreSQL. 버전은 `NULLS NOT DISTINCT` 등 필요한 제약을 확인 후 고정. 스키마 변경 도구는 미정 |
| 패키지 | `com.newcafe.backend` (`backend-지시서.txt`의 `com.new-cafe.backend`는 Java 패키지에 `-`를 쓸 수 없어 교정) |

초기 `build.gradle`에 넣을 항목:

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '4.1.1'
    id 'io.spring.dependency-management' version '1.1.7'
}

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-webmvc'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    runtimeOnly 'org.postgresql:postgresql'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    developmentOnly 'org.springframework.boot:spring-boot-devtools'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') { useJUnitPlatform() }
```

Boot 4.1에서는 기존 `spring-boot-starter-web`보다 `spring-boot-starter-webmvc`를 사용한다. JUnit Jupiter는 `starter-test`에 포함되므로 별도 JUnit 버전을 넣지 않는다. 입력 검증용 `validation`을 추가한다. 인증을 구현할 때 `spring-boot-starter-security`와 `spring-boot-starter-security-test`를 추가하고, 비밀번호 해시·세션/쿠키·CSRF 정책을 정한다. 스키마 적용 방식을 Q4에서 정한 뒤 JPA의 `ddl-auto=validate`로 실제 스키마와 엔티티의 일치를 검사한다. 실제 PostgreSQL 통합 테스트는 Testcontainers로 확인한다.

## 3계층 아키텍처

요청 흐름은 **Controller → Service → Repository → PostgreSQL**로 고정한다. Controller는 페이지를 기준으로 만들되 **같은 대상의 목록·상세·등록·수정 페이지는 하나의 Controller·Service 쌍**에서 다룬다. 일반 페이지는 `controller/`·`service/` 바로 아래에, 관리자 페이지만 각 `admin/` 하위 폴더에 둔다. 비회원과 회원은 폴더로 나누지 않고 메서드별 인증·권한으로 구분한다. Repository와 Entity는 여러 페이지가 공유한다.

```text
backend/
├─ build.gradle, settings.gradle, gradlew, gradle/wrapper/
├─ src/main/java/com/newcafe/backend/
│  ├─ BackendApplication.java
│  ├─ controller/
│  │  ├─ HomeController.java, LoginController.java, SignupController.java
│  │  ├─ MyController.java
│  │  ├─ MenusController.java, CartController.java
│  │  ├─ CheckoutController.java, OrdersController.java
│  │  ├─ MusicBoxController.java, MySongsController.java
│  │  └─ admin/UsersController.java, CategoriesController.java
│  │           MenusController.java
│  │           OrdersController.java, SongsController.java
│  ├─ service/
│  │  ├─ HomeService.java, LoginService.java, SignupService.java
│  │  ├─ MyService.java
│  │  ├─ MenusService.java, CartService.java
│  │  ├─ CheckoutService.java, OrdersService.java
│  │  ├─ MusicBoxService.java, MySongsService.java
│  │  └─ admin/UsersService.java, CategoriesService.java
│  │           MenusService.java
│  │           OrdersService.java, SongsService.java
│  ├─ repository/
│  │  ├─ UserRepository.java, CategoryRepository.java, MenuRepository.java
│  │  ├─ CartItemRepository.java, OrderRepository.java
│  │  └─ MusicRequestRepository.java, MusicBoxStateRepository.java
│  ├─ entity/
│  │  ├─ User.java, Category.java, Menu.java, CartItem.java
│  │  └─ Order.java, OrderItem.java, MusicRequest.java, MusicBoxState.java
│  ├─ dto/
│  │  ├─ LoginRequest.java, SignupRequest.java, AuthResponse.java, MenuResponse.java
│  │  ├─ UpdateProfileRequest.java, CartItemRequest.java, CartResponse.java
│  │  ├─ CreateOrderRequest.java, OrderResponse.java, SongRequest.java, NowPlayingResponse.java
│  │  └─ admin/CategoryRequest.java, MenuRequest.java, OrderResponse.java
│  │           ChangeOrderStatusRequest.java, SongRequest.java
│  └─ common/
│     ├─ error/ApiExceptionHandler.java, ErrorResponse.java
│     └─ security/SecurityConfig.java, CurrentUser.java
├─ src/main/resources/application.yml
└─ src/test/java/com/newcafe/backend/
   ├─ controller/MenusControllerTest.java
   ├─ controller/CheckoutControllerTest.java
   ├─ controller/admin/OrdersControllerTest.java
   ├─ service/CheckoutServiceTest.java
   └─ repository/MenuRepositoryTest.java
```

Controller와 Service의 **파일명 앞부분은 서로 같다**. 현재 프론트 페이지 및 WBS 화면과 대응은 다음과 같다.

| 위치 | 프론트 페이지 → 클래스명 앞부분 (`*Controller.java`, `*Service.java`) |
| --- | --- |
| 기본 | `/` → `Home`, `/login` → `Login`, `/signup` → `Signup`, `/my`·`/profile/update` → `My`(`profile/update`는 WBS 화면, 추가 예정), `/menus`·`/menus/[slug]` → `Menus`, `/cart` → `Cart`, `/checkout` → `Checkout`, `/my/orders`·`/my/orders/[id]` → `Orders`, `/musicbox` → `MusicBox`, `/my/songs` → `MySongs` |
| `admin/` | `/admin/users`·`/admin/users/[id]`·`/admin/users/new` → `Users`(`users/new`는 DB 설계 확장, 추가 예정), `/admin/categories` → `Categories`, `/admin/menus`·`/admin/menus/[id]`·`/admin/menus/new`·`/admin/menus/[id]/edit` → `Menus`, `/admin/orders`·`/admin/orders/[id]` → `Orders`, `/admin/songs` → `Songs` |

이 트리는 **구현될 파일의 위치와 이름**이다. 관리자 메뉴의 목록·상세·등록·수정은 모두 `controller/admin/MenusController.java` → `service/admin/MenusService.java` → 공통 `repository/MenuRepository.java`를 사용한다. 관리자 회원의 목록·상세·등록·수정도 `admin/UsersController.java`와 `admin/UsersService.java`에서 다룬다. `/my` 조회와 `/profile/update` 수정은 `MyController.java`와 `MyService.java`에서 다룬다. `/admin` 대시보드는 WBS에 전용 API가 없어 기존 메뉴·주문·신청곡 API를 조합하며 빈 DashboardController를 만들지 않는다. 스키마 파일의 위치·이름은 Q4 결정 후 정한다.

| 계층 | 책임 |
| --- | --- |
| Controller | `/api/v1` 요청·응답, DTO 검증, HTTP 상태와 오류 변환. Entity를 직접 반환하지 않음 |
| Service | 권한·업무 규칙, 가격 재검증, 상태 전이, 트랜잭션·중복 요청 제어 |
| Repository | JPA 조회·저장 및 필요한 잠금·검색 쿼리. PostgreSQL 전용 제약은 Q4에서 정한 스키마 파일로 관리 |

`controller`는 `repository`를 직접 호출하지 않고, `service`는 HTTP 객체에 의존하지 않는다. 로그인은 `LoginController`, `/my`의 로그아웃은 `MyController`, 메뉴 상세의 장바구니 담기는 `MenusController`, 뮤직박스 신청은 `MusicBoxController`에 둔다. 관리자의 메뉴 삭제는 `admin/MenusController`, 주문 상태 변경은 `admin/OrdersController`, 회원 상태 변경은 `admin/UsersController`가 소유한다. API 경로는 WBS의 `/api/v1/...`를 기준으로 하되 화면 URL을 그대로 복제하지 않는다. 인증은 폴더가 아니라 메서드별로 검사한다. 공통 예외 형식과 페이지네이션을 API 계약으로 통일한다. ID는 `BIGINT IDENTITY`, 금액은 원 단위 정수, 시각은 DB `TIMESTAMPTZ`·API ISO 8601로 다룬다. DB 접속 정보와 첫 관리자 비밀번호는 환경 변수로만 주입한다.

### WBS API와 Controller 대응

아래는 WBS `전체` 시트의 API 열을 페이지별로 배정한 결과다. 목록의 쿼리 문자열은 각 GET 요청의 선택 매개변수다.

| 일반 페이지 Controller | 담당 API | WBS |
| --- | --- | --- |
| `HomeController` | `GET /api/v1/index/menus`, `GET /api/v1/index/songs` | 인덱스 조회 |
| `LoginController` | `POST /api/v1/auth/login` | 1.1 |
| `SignupController` | `POST /api/v1/auth/signup` | 1.3 |
| `MyController` | `GET /api/v1/my`, `PUT /api/v1/users/{id}`, `POST /api/v1/auth/logout` | 1.5, 1.4, 1.2 |
| `MenusController` | `GET /api/v1/menus` (`q`, `category`, `status`, `sort`), `GET /api/v1/menus/{slug}`, `POST /api/v1/menus/{id}/cart/items`(회원 인증) | 4.1~4.3, 14.1 |
| `CartController` | `GET /api/v1/cart/items`, `PUT/DELETE /api/v1/cart/items/{id}` | 14.2~14.4 |
| `CheckoutController` | `POST /api/v1/orders`(실제 결제 없이 주문 접수) | 6.1 |
| `OrdersController` | `GET /api/v1/orders`, `GET /api/v1/orders/{id}` | 6.3~6.4 |
| `MusicBoxController` | `POST/GET /api/v1/musicbox/songs`, `GET /api/v1/songs/now`(POST는 회원 인증) | 11.1~11.3 |
| `MySongsController` | `GET /api/v1/my/songs`, `DELETE /api/v1/my/songs/{id}` | 11.4~11.5 |

| `admin/` Controller | 담당 API | WBS |
| --- | --- | --- |
| `UsersController` | `GET/POST /api/v1/admin/users`(POST는 DB 설계의 추가 기능), `GET/PUT /api/v1/admin/users/{id}` | 2.1~2.3, POST는 WBS 외 |
| `CategoriesController` | `POST /api/v1/admin/categories`, `PUT/DELETE /api/v1/admin/categories/{id}`, `PUT /api/v1/admin/categories/order`; 화면 목록용 `GET /api/v1/admin/categories`는 추가 계약 | 13.1~13.4 |
| `MenusController` | `GET/POST /api/v1/admin/menus`(GET은 검색·필터), `GET/PUT/DELETE /api/v1/admin/menus/{id}` | 3.1~3.5 |
| `OrdersController` | `GET /api/v1/admin/orders`(검색·필터·정렬), `GET /api/v1/admin/orders/{id}`, `PUT /api/v1/admin/orders/status`; 관리자 취소 API는 추가 계약 | 5.1~5.3/12.1~12.3 |
| `SongsController` | `GET /api/v1/admin/songs`, `PUT /api/v1/admin/songs/{id}/cancel`, `POST /api/v1/admin/songs/playlist`, `PUT /api/v1/admin/songs/playlist/{id}/order`, `PUT /api/v1/admin/songs/playlist/{id}`, `POST /api/v1/admin/songs/playlist/{id}/play`, `POST /api/v1/admin/songs/current/finish`, `POST /api/v1/admin/songs/current/cancel` | 10.1~10.9 |

WBS 5.3의 `/api/v1/admin/orders/focus`와 12.3의 `/api/v1/admin/orders/status`는 같은 상태 변경 기능이다. 뒤에 기재된 **12.3의 `/status` 하나**를 계약 초안으로 사용한다. 메뉴 목록 API의 끝 슬래시는 제거하고 경로 표기를 통일한다. WBS 14.5의 `PUT /api/v1/cart/items/selection`은 DB 설계에 따라 화면의 선택 상태로 처리해 서버 API를 만들지 않는다. WBS 6.2 고객 주문 취소, 7~8 실제 결제·결제수단, 11 반복 모드는 현재 DB 설계에서 보류되어 이번 Controller에 배정하지 않는다. WBS 8.2·8.4와 관리자 주문 취소는 API 주소가 없으므로 구현 착수 전에 계약을 정한다.

## DB 설계 반영

| 테이블 | 핵심 계약과 제약 |
| --- | --- |
| `users` | 소문자 정규화 이메일 유일, 비밀번호 해시 저장, `customer`/`admin` 역할과 `active`/`suspended` 상태. 정지 회원의 기존 세션도 차단. 첫 관리자는 비밀 값을 읽는 초기 설정 명령으로 생성하고 이후 관리자만 다른 관리자를 생성. |
| `categories` | 이름·`display_order` 유일. 삭제 불가인 보호 `기타` 한 개를 초기화. 다른 카테고리를 지울 때 연결 메뉴를 `기타`로 옮기고 같은 트랜잭션에서 삭제. |
| `menus` | 카테고리 하나, 변경·재사용하지 않는 고유 `slug`, 양수 가격, `hot`/`iced` 지원 여부, `is_new`·`recommended`. 삭제는 `available=false`와 `archived_at`을 쓰는 숨김 처리. |
| `cart_items` | 회원·메뉴·온도별 한 줄, 수량 1~20. 메뉴 이름·가격은 복제하지 않고 현재 메뉴에서 읽음. `NULL` 온도도 중복 방지. |
| `orders`, `order_items` | 주문 헤더에 회원·매장/포장·카운터 결제수단·요청사항·상태·총액·`status_version`; 품목에 당시 이름·이미지·옵션·단가·수량·합계를 불변 스냅샷으로 저장. |
| `music_requests`, `music_box_state` | 신청 상태 `pending`→`queued`→`playing`→`played`와 `cancelled`. 단일 상태 행(`id=1`)의 `revision`을 올리며 재생 중 곡은 최대 1개. |

현재 스키마에는 실제 결제 거래·결제수단 테이블이 없다. 이번 DB 구축에도 포함하지 않는다. 기존 프론트 목 데이터를 이관하지 않으며 초기 데이터는 보호 `기타`와 첫 관리자만 둔다. 세트 메뉴는 구성품 관계 없이 메뉴 한 건이다.

### 트랜잭션과 동시성

1. **장바구니:** 내용과 수량은 서버에 저장해 기기 간 동기화한다. WBS 14.5의 체크 상태는 화면에 두고 주문 요청에 선택한 `cart_item_id` 목록을 보낸다. `(user_id, menu_id, temperature)`의 `NULL` 안전 유니크 인덱스를 만들고 회원 행 잠금으로 동시 수정을 직렬화한다.
2. **주문:** 서버가 선택 항목의 소유권·판매 상태·온도·현재 가격·예상 합계를 재검증한다. 주문·품목 저장과 선택 항목 제거를 한 트랜잭션으로 처리한다. `customer_id/created_at`, `status/created_at` 인덱스를 둔다.
3. **상태:** `received ↔ preparing ↔ ready ↔ completed`에서 한 단계씩 이동한다. 관리자는 `received → canceled`만 취소할 수 있다. `status_version`으로 두 관리자의 충돌을 감지한다. 고객은 취소 상태를 조회하지만 이번 버전의 취소 API는 제공하지 않는다.
4. **뮤직박스:** `music_box_state` 단일 행 잠금과 `revision` 증가를 한 트랜잭션에 묶고, `queued` 순서 유일·`playing` 최대 한 건을 DB 인덱스로 보장한다. 서버가 `started_at + duration_seconds`로 종료·다음 곡을 계산하고 `serverNow`·종료 예정 시각을 응답한다.

이 제약은 JPA 어노테이션만으로 끝내지 않고 Q4에서 정한 스키마 적용 방식에 따라 FK·CHECK·UNIQUE·부분 인덱스로 명시한다. PostgreSQL의 `NULLS NOT DISTINCT` 지원 여부를 버전 선정 때 확인한다.

## WBS와 현재 코드의 차이

| 항목 | 이번 청사진의 처리 |
| --- | --- |
| WBS 13.x 카테고리, 14.x 장바구니 | 최신 WBS의 번호와 CRUD를 사용한다. 프론트엔드 청사진의 13.x 리뷰·15.0 장바구니 번호는 사용하지 않는다. |
| WBS 6.2 고객 주문 취소, 11 반복 모드 | WBS 항목은 남겨 두되 현재 DB 설계에서 제외한 결정에 따라 후속 단계로 보류한다. Q2·Q3 후 API·스키마를 확장한다. |
| WBS 7~8 결제, 9.x 관리자 결제 | 현재는 카운터 결제수단 선택만 주문에 저장한다. 실제 결제·수단 CRUD는 Q1과 별도 설계 뒤 구현한다. 9.x는 세부 작업이 없다. |
| 관리자 주문 5.x/12.x | 같은 기능이 중복되어 한 구현으로 합친다. 두 API 경로가 달라 계약을 하나로 확정한다. |
| 프론트엔드 목 데이터 | UUID 메뉴 ID, `ice`, 영문 메뉴명·복수 카테고리와 DB 설계의 BIGINT ID, `iced`, `slug`·단일 카테고리가 충돌한다. API DTO를 확정한 뒤 프론트 어댑터를 교체한다. |
| 배달·리뷰 | 현재 WBS에 없으므로 이번 백엔드 범위에서 제외한다. |

## 개발 순서 TODO

각 단계는 DB 스키마 → Repository → Service → Controller·DTO → API 테스트를 하나의 기능으로 완성한다. 완료 조건은 해당 API 테스트와 실제 화면 호출이다.

### 0. 기반 구축 (S1~S2)

- [ ] `backend/`에 Gradle Wrapper·Java 21·Boot 4.1.1 프로젝트와 기본 의존성을 만든다. `./gradlew test`를 실행한다.
- [ ] Q4의 스키마 적용 방식을 정하고 PostgreSQL 버전·DB 환경 변수·`application.yml`을 구성한다. DB 연결을 확인한다.
- [ ] 공통 오류 응답·입력 검증·`/api/v1` 규칙을 만든다. `./gradlew bootRun`과 잘못된 요청의 400 응답을 확인한다.

### 1. 회원가입과 회원 관리 (S3~S4, WBS 1.x/2.x)

- [ ] `users` 스키마와 회원가입·로그인·로그아웃·내 정보 조회·수정 API를 만들고 본인/타인 권한 테스트를 통과시킨다.
- [ ] `frontend/app/(public)/login`, `signup`, `frontend/app/(customer)/my`의 목 세션 호출과 쿠키 전달을 API 계약으로 바꾸고 WBS의 `/profile/update` 화면을 추가한다. 가입 → 로그인 → 내 정보 수정 → 로그아웃을 확인한다.
- [ ] 비밀 값을 읽는 첫 관리자 생성 절차와 관리자 회원 목록·상세·생성·고객 정지·해제 API를 만든다. 관리자 계정 상태 변경은 거부한다.
- [ ] `frontend/app/admin/users`를 API에 연결하고 `/admin/users/new`를 추가한다. 관리자로 다른 관리자를 생성하거나 고객을 정지한 결과를 화면에서 확인한다.

### 2. 관리자가 메뉴를 준비하고 방문자가 조회 (S5~S6, WBS 3.x/4.x/13.x)

- [ ] `categories` 스키마와 보호된 `기타`를 만들고 카테고리 조회·등록·이름 수정·순서 변경·삭제 API를 구현한다. `기타` 보호와 메뉴 이동을 검증한다.
- [ ] `frontend/app/admin/categories`를 API에 연결한다. 카테고리 등록과 순서 변경을 화면에서 확인한다.
- [ ] 관리자 메뉴 등록·목록·상세·수정·숨김과 공개 메뉴 검색·상세·추천 API를 만든다. `slug`·가격·온도 옵션을 검증한다.
- [ ] `frontend/app/admin/menus`, `frontend/app/(public)/menus/[slug]`, `/`의 목 호출을 API로 바꾼다. 등록·수정 결과가 방문자 화면에 반영되고, 카테고리 삭제 시 메뉴가 `기타`로 이동하는지 확인한다.

### 3. 장바구니에서 주문 확인까지 (S7~S11, WBS 6.1/6.3/6.4/14.x)

- [ ] 장바구니 담기·조회·수량 변경·삭제 API를 만든다. 회원·메뉴·온도별 한 줄 제약과 다른 기기 동기화를 검증한다.
- [ ] `frontend/app/_lib/cart/CartContext.tsx`의 `localStorage` 저장을 회원별 API로 바꾼다. 메뉴 상세 → `/cart`에서 수량·삭제·새로고침 후 유지 여부를 확인한다.
- [ ] 선택된 `cartItemIds`, 매장/포장, `card`/`cash`, 요청사항을 받는 주문 생성 API와 내 주문 목록·상세 API를 만든다. 금액 재검증·스냅샷·중복 제출을 검증한다.
- [ ] `frontend/app/(customer)/checkout`, `my/orders`를 API에 연결한다. 선택 항목만 주문되고 `/my/orders/[id]`에 `received` 상태와 주문서 값이 보이는지 확인한다.

### 4. 관리자가 주문을 처리 (WBS 5.x/12.x)

- [ ] 관리자 주문 검색·상세·인접 상태 변경·`received` 취소 API를 만든다. `status_version` 충돌과 취소 권한을 검증한다.
- [ ] `frontend/app/admin/orders`를 API에 연결한다. 관리자 상태 변경 결과가 `/my/orders/[id]`에 반영되는지 고객 화면에서 확인한다.

### 5. 신청곡 접수부터 재생까지 (S12~S13, WBS 10.x/11.x)

- [ ] 회원 신청·목록·내 신청 조회·삭제, 홈 요약·현재 곡 조회 API를 만든다. 신청자 권한을 검증한다.
- [ ] `frontend/app/(public)/musicbox`, `frontend/app/(customer)/my/songs`와 홈의 목 호출을 API로 바꾼다. 신청 직후 목록과 내 신청 내역을 확인한다.
- [ ] 관리자 신청 취소·재생 목록 추가·순서·상태·지금 재생·완료 API를 만든다. 단일 재생과 자동 다음 곡을 검증한다.
- [ ] `frontend/app/admin/songs`를 API에 연결한다. 관리자가 선곡하면 `/musicbox`의 현재 곡과 대기 목록이 갱신되는지 확인한다.

### 프론트엔드에서 테스트할 수 있는 구간

각 단계의 프론트 체크 항목까지 완료해야 그 단계가 끝난다. 화면 연결은 마지막으로 미루지 않는다. 기존 목 데이터는 이관하지 않으며, 화면별 기존 목 저장소 호출을 해당 API 어댑터로 교체한다. 각 구간에서 `frontend`의 `npm run lint`, `npm run typecheck`와 브라우저 사용 흐름을 확인한다.

| 단계 완료 후 | 브라우저에서 열 화면 | 확인할 결과 |
| --- | --- | --- |
| 1 | `/signup` → `/login` → `/my` → `/profile/update`, `/admin/users` → `/admin/users/new` | 가입·로그인·본인 정보 수정·고객 정지·관리자 생성 |
| 2 | `/admin/categories` → `/admin/menus` → `/menus/[slug]`, `/` | 관리자가 등록한 메뉴가 방문자에게 보임 |
| 3 | `/menus/[slug]` → `/cart` → `/checkout` → `/my/orders/[id]` | 선택 품목만 `received` 주문으로 저장됨 |
| 4 | `/admin/orders/[id]` → `/my/orders/[id]` | 관리자가 바꾼 주문 상태를 고객이 확인함 |
| 5 | `/musicbox` → `/my/songs` → `/admin/songs` | 신청·선곡·현재 곡이 같은 데이터로 보임 |

### 후속: WBS에는 있으나 현재 DB 설계에서 보류

- [ ] Q1 결정 후 WBS 7~8의 실제 주문 결제·결제 취소·결제수단 CRUD를 별도 스키마와 API로 설계한다. 카드 원문은 저장하지 않는다.
- [ ] Q2 결정 후 WBS 6.2 고객 주문 취소를 추가한다. 결제 상태·환불 규칙과 함께 테스트한다.
- [ ] Q3 결정 후 WBS 11 반복 모드를 추가한다. 기존 자동 다음 곡 규칙과 충돌하지 않는지 테스트한다.

## 브랜치·커밋

- 현재 브랜치 `feature/backend-project-setup`에서 청사진을 작성한다. 구현은 기능별 `feature/*` 브랜치와 PR로 나누고 `main`·`develop`에는 직접 커밋하지 않는다.
- 이 문서 커밋 예: `docs: 백엔드 개발 청사진 추가`.

## 가정과 출처

- WBS의 API 경로는 초안이다. `GET /api/v1/menus/`의 끝 슬래시, `/api/v1/admin/orders/focus`와 `/status`의 중복, 결제수단 등록에 재사용된 `/api/v1/checkout`은 구현 전에 기능별 REST 계약으로 정리한다.
- [DB 설계](../../docs/database-design.md)의 스키마·트랜잭션·현재 제외 범위를 이번 구현에 적용했다. WBS의 보류 항목은 위 후속 목록에서 추적한다.
- Boot 4.1.1·Java/Gradle 지원과 스타터 구성은 2026-10-20 기준 [Spring Boot 시스템 요구사항](https://docs.spring.io/spring-boot/system-requirements.html), [빌드 시스템](https://docs.spring.io/spring-boot/reference/using/build-systems.html), [테스트](https://docs.spring.io/spring-boot/reference/testing/)에서 확인했다.
