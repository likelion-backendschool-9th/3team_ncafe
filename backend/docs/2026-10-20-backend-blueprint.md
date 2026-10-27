# 삼다방 백엔드 청사진

## 한눈에

- 끝나면: `backend/`에서 Spring Boot API가 PostgreSQL을 사용하고, 회원이 메뉴 탐색 → 장바구니 → 매장/포장 주문 → 주문 확인을 하며 관리자가 이를 운영할 수 있다.
- 결정 필요: WBS의 실제 결제·현재 곡 반복 모드를 후속 단계에서 구현할 때의 정책. 고객 주문 취소는 제공하지 않기로 확정했다(2026-10-27).
- 규모: 기반 구축 후 기능별로 API와 프론트 화면을 함께 연결한다.
- 기준: 2026-10-20에 읽은 [WBS `전체` 시트](https://docs.google.com/spreadsheets/d/14uSQMZDxGkvPw1hTfxbDsvIzxcyETHBFlY8h1oNOil0/edit?gid=0#gid=0)를 기능 목록의 우선 근거로, 같은 날짜의 [DB 설계](../../docs/database-design.md)를 이번 구현의 데이터·정책 기준으로 삼는다. 프론트엔드보다 WBS의 최신 항목을 우선한다.

## 먼저 확정할 질문

1. Q1 — WBS 7~8의 실제 결제와 결제수단 CRUD를 별도 단계로 진행할 때, 사용할 PG와 토큰화·환불 규칙은 무엇인가?
2. Q2 — (확정 2026-10-27) WBS 6.2의 고객 주문 취소는 제공하지 않는다. 주문 취소는 관리자가 `received`에서만 한다.
3. Q3 — WBS 11의 반복 모드를 다시 포함할 때, 현재 곡 반복과 전체 목록 반복 중 무엇을 뜻하는가?

현재 DB 설계에 따라 주문 확정 시 실제 청구 없이 `received`가 된다. 주문서의 `card`/`cash`는 카운터에서 사용할 결제수단 선택값이다. 질문 1~3은 이번 기반·핵심 API 구현의 선행 조건이 아니다. 테이블은 Spring Boot 배포 시 Hibernate가 생성·갱신한다.

## 요구사항과 검증 시나리오

### R1. 실행 가능한 백엔드

`backend/`에 Java 21, Spring Boot 4.1.x, Gradle, PostgreSQL 기반 REST API 프로젝트를 만들고 JUnit 테스트를 실행할 수 있다.

S1 정상
- Given PostgreSQL의 빈 개발 DB와 환경 변수 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`가 있다.
- When `cd backend && ./gradlew test bootRun`을 실행한다.
- Then 테스트가 통과하고 API가 시작되며 DB 연결 오류가 없고 엔티티에 대응하는 테이블이 생성된다.

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

회원은 메뉴를 장바구니에 담아 조회·수량 변경·삭제·품목 선택을 하고, 선택한 품목으로 주문을 생성·조회한다. 관리자는 주문을 검색·상세 조회·상태 변경·접수 상태에서 취소한다. (WBS 5.x/12.x, 6.1/6.3/6.4, 14.x; 6.2는 제외)

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
| DB | PostgreSQL. 버전은 `NULLS NOT DISTINCT` 등 필요한 제약을 확인 후 고정. Spring Boot 시작 시 Hibernate `ddl-auto=update`로 테이블 생성·갱신 |
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

Boot 4.1에서는 기존 `spring-boot-starter-web`보다 `spring-boot-starter-webmvc`를 사용한다. JUnit Jupiter는 `starter-test`에 포함되므로 별도 JUnit 버전을 넣지 않는다. 입력 검증용 `validation`을 추가한다. 인증을 구현할 때 `spring-boot-starter-security`와 `spring-boot-starter-security-test`를 추가하고, 비밀번호 해시·세션/쿠키·CSRF 정책을 정한다. `application.yml`에 `spring.jpa.hibernate.ddl-auto: update`를 명시해 배포 시 엔티티에 대응하는 테이블을 생성·갱신한다. `create`·`create-drop`은 재시작 때 데이터를 지우므로 사용하지 않는다. 실제 PostgreSQL 통합 테스트는 Testcontainers로 확인한다.

## 3계층 아키텍처

요청 흐름은 **Controller → Service → Repository → PostgreSQL**로 고정한다. Controller는 **시스템 단위**로 나눈다. 같은 시스템의 목록·상세·등록·수정 API는 하나의 Controller에서 다루고, 파일명은 `도메인명 + 계층명`으로 짓는다(예: `MenusController.java`·`MenusService.java`·`MenuRepository.java`). 여러 도메인의 데이터를 조합하는 화면은 `HomeController`처럼 화면 이름을 쓴다. `/musicbox`는 화면 경로이며 곡 관련 API는 `SongsController`가 담당한다. `/checkout`의 주문 확정은 주문 시스템의 기능이므로 `my/OrdersController`가 담당한다. 공개 조회 시스템은 `controller/`·`service/` 바로 아래에, 로그인한 회원의 장바구니·주문과 마이페이지는 각 `my/`, 관리자 시스템은 각 `admin/` 하위 폴더에 둔다. 폴더는 화면 URL이 아니라 API의 사용 권한과 업무 범위에 따라 정하며, 메서드별 인증·권한도 검사한다. 예외로 곡 신청(`POST /api/v1/musicbox/songs`)은 로그인이 필요하지만 같은 경로의 공개 목록과 함께 공통 `SongsController`가 받고, 메서드에서 회원을 확인한다. Repository와 Entity는 여러 시스템이 공유한다. 여러 시스템이 같은 업무 규칙을 실행해야 하면 `service/support/`에 둔다 (아래 트리 설명).

```text
backend/
├─ build.gradle, settings.gradle, gradlew, gradle/wrapper/
├─ src/main/java/com/newcafe/backend/
│  ├─ BackendApplication.java
│  ├─ controller/
│  │  ├─ HomeController.java, AuthController.java
│  │  ├─ MenusController.java, SongsController.java
│  │  ├─ my/UsersController.java, CartItemsController.java
│  │  │     OrdersController.java, SongsController.java
│  │  └─ admin/UsersController.java, CategoriesController.java
│  │           MenusController.java, OrdersController.java
│  │           SongsController.java
│  ├─ service/
│  │  ├─ HomeService.java, AuthService.java
│  │  ├─ MenusService.java, SongsService.java
│  │  ├─ my/UsersService.java, CartItemsService.java
│  │  │     OrdersService.java, SongsService.java
│  │  ├─ admin/UsersService.java, CategoriesService.java
│  │  │        MenusService.java, OrdersService.java
│  │  │        SongsService.java
│  │  └─ support/MusicBoxSettler.java   # 여러 시스템이 같이 쓰는 Service 계층 부품
│  ├─ repository/
│  │  ├─ UserRepository.java, CategoryRepository.java, MenuRepository.java
│  │  ├─ CartItemRepository.java, OrderRepository.java
│  │  └─ SongRepository.java, MusicBoxStateRepository.java
│  ├─ entity/                 # 도메인별 하위 폴더, 도메인 전용 값·규칙 클래스도 함께 둔다
│  │  ├─ user/User.java, category/Category.java, menu/Menu.java
│  │  ├─ cartitem/CartItem.java, order/Order.java, order/OrderItem.java
│  │  └─ song/Song.java, song/MusicBoxState.java
│  ├─ dto/
│  │  ├─ auth/LoginRequest.java, SignupRequest.java, AuthResponse.java
│  │  ├─ users/UserResponse.java, UpdateProfileRequest.java
│  │  │        CreateUserRequest.java, UpdateUserStatusRequest.java
│  │  ├─ categories/CategoryRequest.java, CategoryResponse.java
│  │  ├─ menus/MenuRequest.java, MenuResponse.java
│  │  ├─ cartitems/CartItemRequest.java, CartItemsResponse.java
│  │  ├─ orders/CreateOrderRequest.java, OrderResponse.java
│  │  │         AdminOrderResponse.java, ChangeOrderStatusRequest.java
│  │  └─ songs/CreateSongRequest.java, SongResponse.java
│  │           PlaylistItemRequest.java, NowPlayingResponse.java
│  └─ common/
│     ├─ error/ApiExceptionHandler.java, ErrorResponse.java
│     └─ security/SecurityConfig.java, CurrentUser.java
├─ src/main/resources/application.yml
└─ src/test/java/com/newcafe/backend/
   ├─ controller/AuthControllerTest.java
   ├─ controller/MenusControllerTest.java
   ├─ controller/my/CartItemsControllerTest.java
   ├─ controller/my/OrdersControllerTest.java
   ├─ controller/admin/OrdersControllerTest.java
   ├─ service/my/OrdersServiceTest.java
   └─ repository/MenuRepositoryTest.java
```

Controller와 Service는 **같은 시스템 이름**을 공유한다. DTO는 요청 주체인 `my/`·`admin/`이 아닌 **데이터 도메인** 아래에 둔다. 예를 들어 관리자 메뉴 등록과 공개 메뉴 조회의 DTO는 모두 `dto/menus/`에 두고, 관리자 전용 주문 응답은 `dto/orders/AdminOrderResponse.java`로 구별한다. 곡 신청·재생 목록·현재 곡의 DTO는 `dto/songs/`에 모은다. `Song.java`는 DB의 `songs`에 매핑되고, `MusicBoxState.java`는 재생 전환용 내부 상태를 나타낸다. 재생 목록은 별도 테이블 없이 곡의 상태·순서로 다룬다. `service/support/`에는 두 개 이상의 시스템이 같이 쓰는 Service 계층 부품만 둔다. 자기 API가 없어 Controller가 직접 부르지 않고, 자기 트랜잭션을 만들지 않는다(`@Transactional(propagation = MANDATORY)`). 예: `MusicBoxSettler`는 공개·회원·관리자 서비스가 곡을 읽거나 바꾸기 전에 시간이 지난 곡을 정리한다. 위 트리의 파일은 최초 구현 위치를 나타내며 필요한 요청·응답 DTO는 해당 도메인 폴더에 추가한다. 현재 프론트 페이지 및 WBS 화면과 대응은 다음과 같다.

같은 클래스명이 여러 패키지에 있으면 `@RestController("publicMenusController")`·`@RestController("adminMenusController")`처럼 역할별 Bean 이름을 어노테이션에 지정하고, Service도 `@Service`에 고유 이름을 지정한다. 이 규칙은 `Users`·`Menus`·`Orders`·`Songs`에도 적용한다.

장바구니 항목 API 시스템은 `CartItemsController`·`CartItemsService`, 목록 응답은 `CartItemsResponse`로 이름을 맞춘다. 항목 한 건을 나타내는 `CartItem` 엔티티·`CartItemRepository`·`CartItemRequest`는 단수형을 사용한다.

| 위치 | 프론트 페이지 → 시스템 이름 (`*Controller.java`, `*Service.java`) |
| --- | --- |
| 기본 | `/` → `Home`, `/login`·`/signup` 및 `/my`의 로그아웃 동작 → `Auth`, `/menus`의 카테고리 필터·목록과 `/menus/[slug]` → `Menus`(조회), `/musicbox` → `Songs`(공개 목록·현재 곡·곡 신청). `/`의 뮤직박스 칸은 `Home`의 `GET /index/songs`(지금 곡과 사연, 다음 3곡, 플레이리스트 곡 수)로 그리고 변경 감지 폴링만 `GET /songs/now`를 쓴다. `/my/songs`의 현재 곡은 `Songs`의 공개 조회(`GET /musicbox/songs`, `GET /songs/now`)를 보조로 쓴다 |
| `my/` | `/my`·`/profile/update` → `Users`(`profile/update`는 WBS 화면, 추가 예정), `/menus/[slug]`의 담기 동작·`/cart` → `CartItems`, `/checkout`·`/my/orders`·`/my/orders/[id]` → `Orders`, `/my/songs` → `Songs` |
| `admin/` | `/admin/users`·`/admin/users/[id]`·`/admin/users/new` → `Users`(`users/new`는 DB 설계 확장, 추가 예정), `/admin/categories` → `Categories`, `/admin/menus`·`/admin/menus/[id]`·`/admin/menus/new`·`/admin/menus/[id]/edit` → `Menus`, `/admin/orders`·`/admin/orders/[id]` → `Orders`, `/admin/songs` → `Songs` |

`controller/my/`와 `service/my/`는 로그인한 회원의 개인 데이터를 다루는 시스템을 담당한다. `/cart`와 `/checkout`이 `/my` URL 아래에 있지 않아도 장바구니와 주문 생성은 `my/CartItemsController.java`·`my/OrdersController.java`가 받는다. 주문 생성·내 주문 목록·상세는 한 `my/OrdersController.java` → `my/OrdersService.java` → `OrderRepository.java` 흐름으로 처리한다. 공개 곡 목록·현재 곡과 회원 곡 신청은 공통 `SongsController.java`, 내 곡 관리는 `my/SongsController.java`가 받는다. 인증 시스템의 로그인·회원가입·로그아웃은 화면 위치와 관계없이 공통 `AuthController.java`가 담당한다. 관리자 메뉴의 목록·상세·등록·수정은 모두 `controller/admin/MenusController.java` → `service/admin/MenusService.java` → 공통 `repository/MenuRepository.java`를 사용한다. 관리자 회원 시스템은 `admin/UsersController.java`·`admin/UsersService.java`, 마이페이지 회원 정보 시스템은 `my/UsersController.java`·`my/UsersService.java`를 사용하며 두 시스템은 `UserRepository.java`를 공유한다. `/admin` 대시보드는 WBS에 전용 API가 없어 기존 메뉴·주문·신청곡 API를 조합하며 빈 DashboardController를 만들지 않는다. 테이블 생성은 Hibernate의 JPA 자동 스키마 갱신이 맡는다.

| 계층 | 책임 |
| --- | --- |
| Controller | `/api/v1` 요청·응답, DTO 검증, HTTP 상태와 오류 변환. Entity를 직접 반환하지 않음 |
| Service | 권한·업무 규칙, 가격 재검증, 상태 전이, 트랜잭션·중복 요청 제어 |
| Repository | JPA 조회·저장 및 필요한 잠금·검색 쿼리 |

`controller`는 `repository`를 직접 호출하지 않고, `service`는 HTTP 객체에 의존하지 않는다. 로그인·회원가입·로그아웃은 `AuthController`, 메뉴 상세에서 시작하는 장바구니 담기는 `my/CartItemsController`, 곡 신청과 현재 곡 조회는 공통 `SongsController`에 둔다. 관리자의 메뉴 삭제는 `admin/MenusController`, 주문 상태 변경은 `admin/OrdersController`, 회원 상태 변경은 `admin/UsersController`가 소유한다. API 경로는 WBS의 `/api/v1/...`를 기준으로 하되 화면 URL을 그대로 복제하지 않는다. 인증은 폴더가 아니라 메서드별로 검사한다. 공통 예외 형식과 페이지네이션을 API 계약으로 통일한다. ID는 `BIGINT IDENTITY`, 금액은 원 단위 정수, 시각은 DB `TIMESTAMPTZ`·API ISO 8601로 다룬다. DB 접속 정보와 첫 관리자 비밀번호는 환경 변수로만 주입한다.

계층별 책임, 입력 정규화, 공통 오류, 전체 목록 변경 검증, 잠금·flush 사용 기준은 [관리자 카테고리 백엔드 계획](../../docs/admin/categories/2026-10-21-backend-category-management.md)의 구현 기준을 참고한다. 카테고리의 잠금 방식은 다른 도메인에 그대로 적용하지 않고 해당 도메인의 동시 수정 규칙에 맞춰 결정한다.

`music_box_state.id`는 고정값 `1`로 두며 일반 ID 자동 생성 규칙을 적용하지 않는다. 공개 메뉴의 카테고리 필터 데이터는 `MenusController` → `MenusService` → `CategoryRepository`가 조회한다. 메뉴 상세의 `/{slug}`와 경로가 겹치지 않도록 `categories`는 메뉴 slug로 사용하지 않는다.

### WBS API와 Controller 대응

아래는 WBS `전체` 시트의 API 열을 시스템별 Controller에 배정한 결과다. 목록의 쿼리 문자열은 각 GET 요청의 선택 매개변수다.

| 공통 시스템 Controller | 담당 API | WBS |
| --- | --- | --- |
| `HomeController` | `GET /api/v1/index/menus`, `GET /api/v1/index/songs` | 인덱스 조회 |
| `AuthController` | `POST /api/v1/auth/login`, `POST /api/v1/auth/signup`, `POST /api/v1/auth/logout` | 1.1~1.3 |
| `MenusController` | `GET /api/v1/menus` (`q`, `category`, `status`, `sort`), `GET /api/v1/menus/categories`(공개 메뉴 필터용 추가 계약), `GET /api/v1/menus/{slug}` | 4.1~4.3, 화면 연동 |
| `SongsController` | `GET /api/v1/musicbox/songs`, `POST /api/v1/musicbox/songs`, `GET /api/v1/songs/now` | 11.1~11.3 |

| `my/` Controller | 담당 API | WBS |
| --- | --- | --- |
| `UsersController` | `GET /api/v1/my`, `PUT /api/v1/users/{id}` | 1.5, 1.4 |
| `CartItemsController` | `POST /api/v1/menus/{id}/cart/items`, `GET /api/v1/cart/items`, `PUT/DELETE /api/v1/cart/items/{id}` | 14.1~14.4 |
| `OrdersController` | `POST /api/v1/orders`(실제 결제 없이 주문 접수), `GET /api/v1/orders`, `GET /api/v1/orders/{id}` | 6.1, 6.3~6.4 |
| `SongsController` | `GET /api/v1/my/songs`, `DELETE /api/v1/my/songs/{id}` | 11.4~11.5 |

| `admin/` Controller | 담당 API | WBS |
| --- | --- | --- |
| `UsersController` | `GET/POST /api/v1/admin/users`(POST는 DB 설계의 추가 기능), `GET/PUT /api/v1/admin/users/{id}` | 2.1~2.3, POST는 WBS 외 |
| `CategoriesController` | `POST /api/v1/admin/categories`, `PUT/DELETE /api/v1/admin/categories/{id}`, `PUT /api/v1/admin/categories/order`; 화면 목록용 `GET /api/v1/admin/categories`는 추가 계약 | 13.1~13.4 |
| `MenusController` | `GET/POST /api/v1/admin/menus`(GET은 검색·필터), `GET/PUT/DELETE /api/v1/admin/menus/{id}` | 3.1~3.5 |
| `OrdersController` | `GET /api/v1/admin/orders`(검색·필터·정렬), `GET /api/v1/admin/orders/{id}`, `PUT /api/v1/admin/orders/status`(인접 상태 변경·접수 취소 공통) | 5.1~5.3/12.1~12.3 |
| `SongsController` | `GET /api/v1/admin/songs`, `PUT /api/v1/admin/songs/{id}/cancel`, `POST /api/v1/admin/songs/playlist`, `PUT /api/v1/admin/songs/playlist/{id}/order`, `PUT /api/v1/admin/songs/playlist/{id}`, `POST /api/v1/admin/songs/playlist/{id}/play`, `POST /api/v1/admin/songs/current/finish`, `POST /api/v1/admin/songs/current/cancel` | 10.1~10.9 |

WBS 5.3의 `/api/v1/admin/orders/focus`와 12.3의 `/api/v1/admin/orders/status`는 같은 상태 변경 기능이다. 뒤에 기재된 **12.3의 `/status` 하나**를 계약 초안으로 사용한다. 메뉴 목록 API의 끝 슬래시는 제거하고 경로 표기를 통일한다. WBS 14.5의 `PUT /api/v1/cart/items/selection`은 DB 설계에 따라 화면의 선택 상태로 처리해 서버 API를 만들지 않는다. WBS 6.2 고객 주문 취소는 제공하지 않기로 확정했고(2026-10-27), 7~8 실제 결제·결제수단, 11 반복 모드는 현재 DB 설계에서 보류되어 이번 Controller에 배정하지 않는다. WBS 8.2·8.4는 API 주소가 없으므로 구현 착수 전에 계약을 정한다. 관리자 주문 취소는 2026-10-26에 같은 `PUT /api/v1/admin/orders/status`의 `nextStatus=canceled`로 계약했다. 요청은 `id`, `expectedStatus`, `statusVersion`, `nextStatus`이며 취소 사유는 받지 않는다. 목록의 `q`·`status`·`group`·`sort`·`page`·`size`와 응답 등 상세 계약은 [관리자 주문 구현 문서](../../docs/admin/orders/2026-10-26-backend-order-management.md)를 따른다.

## DB 설계 반영

| 테이블 | 핵심 계약과 제약 |
| --- | --- |
| `users` | 소문자 정규화 이메일 유일, 비밀번호 해시 저장, `customer`/`admin` 역할과 `active`/`suspended` 상태. 정지 회원의 기존 세션도 차단. 첫 관리자는 비밀 값을 읽는 초기 설정 명령으로 생성하고 이후 관리자만 다른 관리자를 생성. |
| `categories` | 이름·`display_order` 유일. 삭제 불가인 보호 `기타` 한 개를 초기화. 다른 카테고리를 지울 때 연결 메뉴를 `기타`로 옮기고 같은 트랜잭션에서 삭제. |
| `menus` | 카테고리 하나, 변경·재사용하지 않는 고유 `slug`, 양수 가격, `hot`/`iced` 지원 여부, `is_new`·`recommended`. 삭제는 `available=false`와 `archived_at`을 쓰는 숨김 처리. |
| `cart_items` | 회원·메뉴·온도별 한 줄, 수량 1~20. 메뉴 이름·가격은 복제하지 않고 현재 메뉴에서 읽음. `NULL` 온도도 중복 방지. |
| `orders`, `order_items` | 주문 헤더에 회원·매장/포장·카운터 결제수단·요청사항·상태·총액·`status_version`; 품목에 당시 이름·이미지·옵션·단가·수량·합계를 불변 스냅샷으로 저장. |
| `songs`, `music_box_state` | 신청 상태 `pending`→`queued`→`playing`→`played`와 `cancelled`. 단일 상태 행(`id=1`)의 `revision`을 올리며 재생 중 곡은 최대 1개. |

현재 스키마에는 실제 결제 거래·결제수단 테이블이 없다. 이번 DB 구축에도 포함하지 않는다. 기존 프론트 목 데이터를 이관하지 않으며 초기 데이터는 보호 `기타`와 첫 관리자만 둔다. 세트 메뉴는 구성품 관계 없이 메뉴 한 건이다.

### 트랜잭션과 동시성

1. **장바구니:** 내용과 수량은 서버에 저장해 기기 간 동기화한다. WBS 14.5의 체크 상태는 화면에 두고 주문 요청에 선택한 `cart_item_id` 목록을 보낸다. `(user_id, menu_id, temperature)`의 `NULL` 안전 유니크 인덱스를 만들고 회원 행 잠금으로 동시 수정을 직렬화한다.
2. **주문:** 서버가 선택 항목의 소유권·판매 상태·온도·현재 가격·예상 합계를 재검증한다. 주문·품목 저장과 선택 항목 제거를 한 트랜잭션으로 처리한다. `customer_id/created_at`, `status/created_at` 인덱스를 둔다.
3. **상태:** `received ↔ preparing ↔ ready ↔ completed`에서 한 단계씩 이동한다. 관리자는 `received → canceled`만 취소할 수 있다. `status_version`으로 두 관리자의 충돌을 감지한다. 고객은 취소 상태를 조회하지만 이번 버전의 취소 API는 제공하지 않는다.
4. **뮤직박스:** `music_box_state` 단일 행 잠금과 `revision` 증가를 한 트랜잭션에 묶고, `queued` 순서 유일·`playing` 최대 한 건을 DB 인덱스로 보장한다. 서버가 `started_at + duration_seconds`로 종료·다음 곡을 계산하고 `serverNow`·종료 예정 시각을 응답한다.

테이블과 JPA로 표현 가능한 제약은 Hibernate가 애플리케이션 시작 시 생성·갱신한다. `NULL` 안전 유니크·부분 인덱스 등 PostgreSQL 전용 제약은 이 설정만으로 생성된다고 가정하지 않는다. 해당 기능을 구현할 때 제약을 유지할 방법을 따로 정하고 PostgreSQL 통합 테스트로 확인한다. 별도 `sql/` 폴더나 마이그레이션 도구는 현재 사용하지 않는다.

## WBS와 현재 코드의 차이

| 항목 | 이번 청사진의 처리 |
| --- | --- |
| WBS 13.x 카테고리, 14.x 장바구니 | 최신 WBS의 번호와 CRUD를 사용한다. 프론트엔드 청사진의 13.x 리뷰·15.0 장바구니 번호는 사용하지 않는다. |
| WBS 6.2 고객 주문 취소 | 제공하지 않는다(2026-10-27 확정). 주문 취소는 관리자가 `received`에서만 한다. |
| WBS 11 반복 모드 | WBS 항목은 남겨 두되 현재 DB 설계에서 제외한 결정에 따라 후속 단계로 보류한다. Q3 후 API·스키마를 확장한다. |
| WBS 7~8 결제, 9.x 관리자 결제 | 현재는 카운터 결제수단 선택만 주문에 저장한다. 실제 결제·수단 CRUD는 Q1과 별도 설계 뒤 구현한다. 9.x는 세부 작업이 없다. |
| 관리자 주문 5.x/12.x | 같은 기능이 중복되어 한 구현으로 합친다. 두 API 경로가 달라 계약을 하나로 확정한다. |
| 프론트엔드 목 데이터 | UUID 메뉴 ID, `ice`, 영문 메뉴명·복수 카테고리와 DB 설계의 BIGINT ID, `iced`, `slug`·단일 카테고리가 충돌한다. API DTO를 확정한 뒤 프론트 어댑터를 교체한다. |
| 배달·리뷰 | 현재 WBS에 없으므로 이번 백엔드 범위에서 제외한다. |

## 개발 TODO

아래 제목 하나가 구현·검증할 **작업 단위**다. 각 작업에서 필요한 스키마 → Repository → Service → Controller·DTO → API 테스트를 끝내고, 바로 연결할 수 있는 프론트 화면까지 확인한다. 목록 순서는 실제 사용 흐름을 따른다.

### 프로젝트 실행 환경

- [ ] `backend/`에 Gradle Wrapper·Java 21·Boot 4.1.1 프로젝트와 기본 의존성을 만든다. `./gradlew test`를 실행한다.

### PostgreSQL 연결과 공통 API

- [ ] PostgreSQL 버전·DB 환경 변수·`application.yml`의 `ddl-auto=update`를 구성한다. 빈 DB에 배포해 테이블 생성과 재시작 후 데이터 유지를 확인한다.
- [ ] 공통 오류 응답·입력 검증·`/api/v1` 규칙을 만든다. `./gradlew bootRun`과 잘못된 요청의 400 응답을 확인한다.

### 회원가입·로그인·로그아웃 (WBS 1.1~1.3)

- [ ] `users` 스키마와 가입·로그인·로그아웃 API를 만들고 인증·정지 회원 접근 테스트를 통과시킨다.
- [ ] `frontend/app/(public)/signup`, `login`과 `/my`의 목 세션 호출·쿠키 전달을 API 계약으로 바꾼다. 가입 → 로그인 → 로그아웃을 브라우저에서 확인한다.

### 내 정보 조회·수정 (WBS 1.4~1.5)

- [ ] 내 정보 조회·수정 API를 만들고 본인·타인 접근 권한을 검증한다.
- [ ] `frontend/app/(customer)/my`를 API에 연결하고 WBS의 `/profile/update` 화면을 추가한다. 수정 결과와 새로고침 후 유지 여부를 확인한다.

### 관리자 회원 관리 (WBS 2.x, 관리자 생성은 DB 설계 확장)

- [ ] 비밀 값을 읽는 첫 관리자 생성 절차와 관리자 회원 목록·상세·생성·고객 정지·해제 API를 만든다. 관리자 계정의 상태 변경은 거부한다.
- [ ] `frontend/app/admin/users`를 API에 연결하고 `/admin/users/new`를 추가한다. 고객 정지·해제와 다른 관리자 생성 결과를 확인한다.

### 카테고리 관리 (WBS 13.x)

- [ ] `categories` 스키마와 보호된 `기타`를 만들고 관리자 조회·등록·이름 수정·순서 변경·삭제 API를 구현한다. `기타` 보호를 검증한다.
- [ ] `frontend/app/admin/categories`를 API에 연결한다. 등록·순서 변경·삭제 결과를 화면에서 확인한다.

### 메뉴 등록·수정과 공개 조회 (WBS 3.x/4.x)

- [ ] 관리자 메뉴 등록·목록·상세·수정·숨김과 공개 메뉴 검색·상세·추천 및 `GET /api/v1/menus/categories`를 만든다. 예약 slug `categories`·가격·온도 옵션과 카테고리 삭제 시 연결 메뉴가 `기타`로 이동하는지 검증한다.
- [ ] `frontend/app/admin/menus`, `frontend/app/(public)/menus`의 목록·상세, `/`의 목 호출을 API로 바꾼다. 검색·필터·정렬과 관리자 변경이 방문자 화면에 반영되는지 확인한다.

### 회원 장바구니 (WBS 14.1~14.4)

- [ ] `my/CartItemsController`의 담기·조회·수량 변경·삭제 API를 만든다. 회원·메뉴·온도별 한 줄 제약과 다른 기기 동기화를 검증한다.
- [ ] `frontend/app/_lib/cart/CartContext.tsx`의 `localStorage` 저장을 회원별 API로 바꾼다. 메뉴 상세 → `/cart`에서 수량·삭제·새로고침 후 유지 여부를 확인한다.

### 주문 생성과 내 주문 조회 (WBS 6.1/6.3/6.4)

- [ ] `my/OrdersController`에 선택된 `cartItemIds`, 매장/포장, `card`/`cash`, 요청사항을 받는 주문 생성과 내 주문 목록·상세 API를 만든다. 금액 재검증·스냅샷·중복 제출을 검증한다.
- [ ] `frontend/app/(customer)/checkout`, `my/orders`를 API에 연결한다. 선택 항목만 주문되고 `/my/orders/[id]`에 `received` 상태와 주문서 값이 보이는지 확인한다.

### 관리자 주문 처리 (WBS 5.x/12.x)

- [ ] 관리자 주문 검색·상세·인접 상태 변경·`received` 취소 API를 만든다. `status_version` 충돌과 취소 권한을 검증한다.
- [ ] `frontend/app/admin/orders`를 API에 연결한다. 관리자 상태 변경 결과가 `/my/orders/[id]`에 반영되는지 확인한다.

### 곡 신청과 내 신청곡 (WBS 11.x)

- [ ] `SongsController`의 공개 목록·현재 곡 조회·회원 신청과 `my/SongsController`의 내 신청 조회·삭제 API를 만든다. 신청자 권한을 검증한다.
- [x] `frontend/app/(public)/musicbox`, `frontend/app/(customer)/my/songs`와 홈의 목 호출을 API로 바꾼다. 신청 직후 공개 목록과 내 신청 내역을 확인한다.

### 관리자 선곡·재생 (WBS 10.x)

- [ ] 관리자 신청 취소·재생 목록 추가·순서·상태·지금 재생·완료 API를 만든다. 단일 재생과 자동 다음 곡을 검증한다.
- [ ] `frontend/app/admin/songs`를 API에 연결한다. 관리자가 선곡하면 `/musicbox`의 현재 곡과 대기 목록이 갱신되는지 확인한다.

### 프론트엔드에서 테스트할 수 있는 작업

각 작업의 프론트 체크 항목까지 완료해야 해당 작업이 끝난다. 기존 목 데이터는 이관하지 않으며, 화면별 목 저장소 호출을 해당 API 어댑터로 교체한다. 화면 연결 작업에서는 `frontend`의 `npm run lint`, `npm run typecheck`와 브라우저 사용 흐름을 확인한다.

| 작업 | 브라우저에서 열 화면 | 확인할 결과 |
| --- | --- | --- |
| 회원 인증 | `/signup` → `/login` → `/my` | 가입·로그인·로그아웃 |
| 내 정보 | `/my` → `/profile/update` | 본인 정보 수정·새로고침 후 유지 |
| 관리자 회원 | `/admin/users` → `/admin/users/new` | 고객 정지·해제와 관리자 생성 |
| 카테고리 | `/admin/categories` | 등록·순서 변경·삭제 |
| 메뉴 | `/admin/menus` → `/menus` → `/menus/[slug]`, `/` | 등록·수정 결과와 검색·필터·정렬이 방문자에게 보임 |
| 장바구니 | `/menus/[slug]` → `/cart` | 회원별 담기·수량 변경·삭제·새로고침 후 유지 |
| 내 주문 | `/cart` → `/checkout` → `/my/orders/[id]` | 선택 품목만 `received` 주문으로 저장됨 |
| 관리자 주문 | `/admin/orders/[id]` → `/my/orders/[id]` | 관리자 상태 변경을 고객이 확인함 |
| 곡 신청 | `/musicbox` → `/my/songs` | 신청곡이 공개 목록과 내 신청 내역에 보임 |
| 관리자 선곡 | `/admin/songs` → `/musicbox` | 선곡·재생 결과가 현재 곡과 대기 목록에 반영됨 |

### 후속 작업: WBS에는 있으나 현재 DB 설계에서 보류

- [ ] Q1 결정 후 WBS 7~8의 실제 주문 결제·결제 취소·결제수단 CRUD를 별도 스키마와 API로 설계한다. 카드 원문은 저장하지 않는다.
- [ ] Q3 결정 후 WBS 11 반복 모드를 추가한다. 기존 자동 다음 곡 규칙과 충돌하지 않는지 테스트한다.

## 브랜치·커밋

- 청사진 수정과 기능 구현은 각각 `feature/*` 브랜치에서 작업하고 PR로 `develop`에 제안한다. `main`·`develop`에는 직접 커밋하지 않는다.
- 청사진 수정 커밋 예: `docs: 백엔드 아키텍처 청사진 수정`.

## 가정과 출처

- WBS의 API 경로는 초안이다. `GET /api/v1/menus/`의 끝 슬래시, `/api/v1/admin/orders/focus`와 `/status`의 중복, 결제수단 등록에 재사용된 `/api/v1/checkout`은 구현 전에 기능별 REST 계약으로 정리한다.
- [DB 설계](../../docs/database-design.md)의 스키마·트랜잭션·현재 제외 범위를 이번 구현에 적용했다. WBS의 보류 항목은 위 후속 목록에서 추적한다.
- Boot 4.1.1·Java/Gradle 지원과 스타터 구성은 2026-10-20 기준 [Spring Boot 시스템 요구사항](https://docs.spring.io/spring-boot/system-requirements.html), [빌드 시스템](https://docs.spring.io/spring-boot/reference/using/build-systems.html), [테스트](https://docs.spring.io/spring-boot/reference/testing/)에서 확인했다.
