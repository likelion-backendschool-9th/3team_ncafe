# 삼다방 백엔드 청사진

## 한눈에

- 끝나면: `backend/`에서 Spring Boot API가 PostgreSQL을 사용하고, 회원이 메뉴 탐색 → 장바구니 → 매장/포장 주문 → 주문 확인을 하며 관리자가 이를 운영할 수 있다.
- 결정 필요: WBS의 실제 결제·고객 주문 취소·현재 곡 반복 모드를 후속 단계에서 구현할 때의 정책.
- 규모: 기반 구축 1단계와 사용자 흐름별 5단계. 추정 약 5~8주(1~2명이 순차 구현, 후속 결제 제외).
- 기준: 2026-10-20에 읽은 [WBS `전체` 시트](https://docs.google.com/spreadsheets/d/14uSQMZDxGkvPw1hTfxbDsvIzxcyETHBFlY8h1oNOil0/edit?gid=0#gid=0)를 기능 목록의 우선 근거로, 같은 날짜의 [DB 설계](../../docs/database-design.md)를 이번 구현의 데이터·정책 기준으로 삼는다. 프론트엔드보다 WBS의 최신 항목을 우선한다.

## 먼저 확정할 질문

1. Q1 — WBS 7~8의 실제 결제와 결제수단 CRUD를 별도 단계로 진행할 때, 사용할 PG와 토큰화·환불 규칙은 무엇인가?
2. Q2 — WBS 6.2의 고객 주문 취소를 다시 포함할 때, 허용 상태와 이미 지불한 주문의 환불 규칙은 무엇인가?
3. Q3 — WBS 11의 반복 모드를 다시 포함할 때, 현재 곡 반복과 전체 목록 반복 중 무엇을 뜻하는가?

현재 DB 설계에 따라 주문 확정 시 실제 청구 없이 `received`가 된다. 주문서의 `card`/`cash`는 카운터에서 사용할 결제수단 선택값이다. 질문 1~3은 이번 기반·핵심 API 구현의 선행 조건이 아니다.

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
| DB | PostgreSQL. 버전은 마이그레이션 제약(`NULLS NOT DISTINCT` 등) 확인 후 고정 |
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
    implementation 'org.flywaydb:flyway-core'
    runtimeOnly 'org.flywaydb:flyway-database-postgresql'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    developmentOnly 'org.springframework.boot:spring-boot-devtools'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') { useJUnitPlatform() }
```

Boot 4.1에서는 기존 `spring-boot-starter-web`보다 `spring-boot-starter-webmvc`를 사용한다. JUnit Jupiter는 `starter-test`에 포함되므로 별도 JUnit 버전을 넣지 않는다. 입력 검증용 `validation`을 추가한다. 인증을 구현할 때 `spring-boot-starter-security`와 `spring-boot-starter-security-test`를 추가하고, 비밀번호 해시·세션/쿠키·CSRF 정책을 정한다. DB 변경을 시작할 때 Flyway를 도입해 버전 SQL로 관리하고 JPA의 `ddl-auto=validate`로 스키마를 검사한다. 실제 PostgreSQL 통합 테스트는 Testcontainers로 확인한다.

## 3계층 아키텍처

```text
backend/src/main/java/com/newcafe/backend/
├─ BackendApplication.java
├─ auth/          controller/ service/ repository/ dto/ entity/
├─ user/          controller/ service/ repository/ dto/ entity/
├─ category/      controller/ service/ repository/ dto/ entity/
├─ menu/          controller/ service/ repository/ dto/ entity/
├─ cart/          controller/ service/ repository/ dto/ entity/
├─ order/         controller/ service/ repository/ dto/ entity/
├─ musicbox/      controller/ service/ repository/ dto/ entity/
└─ common/        error/ security/ config/

backend/src/main/resources/
├─ application.yml
└─ db/migration/   # Flyway 도입 후
```

| 계층 | 책임 |
| --- | --- |
| Controller | `/api/v1` 요청·응답, DTO 검증, HTTP 상태와 오류 변환. Entity를 직접 반환하지 않음 |
| Service | 권한·업무 규칙, 가격 재검증, 상태 전이, 트랜잭션·중복 요청 제어 |
| Repository | JPA 조회·저장 및 필요한 잠금·검색 쿼리. SQL 제약은 마이그레이션에서 관리 |

패키지는 기능별로 묶고 각 기능 안에 3계층을 둔다. 공통 예외 형식과 페이지네이션을 API 계약으로 통일한다. ID는 `BIGINT IDENTITY`, 금액은 원 단위 정수, 시각은 DB `TIMESTAMPTZ`·API ISO 8601로 다룬다. DB 접속 정보와 첫 관리자 비밀번호는 환경 변수로만 주입한다.

## DB 설계 반영

| 테이블 | 핵심 계약과 제약 |
| --- | --- |
| `users` | 소문자 정규화 이메일 유일, 비밀번호 해시 저장, `customer`/`admin` 역할과 `active`/`suspended` 상태. 정지 회원의 기존 세션도 차단. 첫 관리자는 비밀 값을 읽는 초기 설정 명령으로 생성하고 이후 관리자만 다른 관리자를 생성. |
| `categories` | 이름·`display_order` 유일. 삭제 불가인 보호 `기타` 한 개를 초기화. 다른 카테고리를 지울 때 연결 메뉴를 `기타`로 옮기고 같은 트랜잭션에서 삭제. |
| `menus` | 카테고리 하나, 변경·재사용하지 않는 고유 `slug`, 양수 가격, `hot`/`iced` 지원 여부, `is_new`·`recommended`. 삭제는 `available=false`와 `archived_at`을 쓰는 숨김 처리. |
| `cart_items` | 회원·메뉴·온도별 한 줄, 수량 1~20. 메뉴 이름·가격은 복제하지 않고 현재 메뉴에서 읽음. `NULL` 온도도 중복 방지. |
| `orders`, `order_items` | 주문 헤더에 회원·매장/포장·카운터 결제수단·요청사항·상태·총액·`status_version`; 품목에 당시 이름·이미지·옵션·단가·수량·합계를 불변 스냅샷으로 저장. |
| `music_requests`, `music_box_state` | 신청 상태 `pending`→`queued`→`playing`→`played`와 `cancelled`. 단일 상태 행(`id=1`)의 `revision`을 올리며 재생 중 곡은 최대 1개. |

현재 스키마에는 실제 결제 거래·결제수단 테이블이 없다. 마이그레이션에서도 만들지 않는다. 기존 프론트 목 데이터를 이관하지 않으며 초기 데이터는 보호 `기타`와 첫 관리자만 둔다. 세트 메뉴는 구성품 관계 없이 메뉴 한 건이다.

### 트랜잭션과 동시성

1. **장바구니:** 내용과 수량은 서버에 저장해 기기 간 동기화한다. WBS 14.5의 체크 상태는 화면에 두고 주문 요청에 선택한 `cart_item_id` 목록을 보낸다. `(user_id, menu_id, temperature)`의 `NULL` 안전 유니크 인덱스를 만들고 회원 행 잠금으로 동시 수정을 직렬화한다.
2. **주문:** 서버가 선택 항목의 소유권·판매 상태·온도·현재 가격·예상 합계를 재검증한다. 주문·품목 저장과 선택 항목 제거를 한 트랜잭션으로 처리한다. `customer_id/created_at`, `status/created_at` 인덱스를 둔다.
3. **상태:** `received ↔ preparing ↔ ready ↔ completed`에서 한 단계씩 이동한다. 관리자는 `received → canceled`만 취소할 수 있다. `status_version`으로 두 관리자의 충돌을 감지한다. 고객은 취소 상태를 조회하지만 이번 버전의 취소 API는 제공하지 않는다.
4. **뮤직박스:** `music_box_state` 단일 행 잠금과 `revision` 증가를 한 트랜잭션에 묶고, `queued` 순서 유일·`playing` 최대 한 건을 DB 인덱스로 보장한다. 서버가 `started_at + duration_seconds`로 종료·다음 곡을 계산하고 `serverNow`·종료 예정 시각을 응답한다.

이 제약은 JPA 어노테이션만으로 끝내지 않고 Flyway SQL의 FK·CHECK·UNIQUE·부분 인덱스로 명시한다. PostgreSQL의 `NULLS NOT DISTINCT` 지원 여부를 버전 선정 때 확인한다.

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

각 단계는 DB 마이그레이션 → Repository → Service → Controller·DTO → API 테스트를 하나의 기능으로 완성한다. 완료 조건은 해당 API 테스트와 실제 화면 호출이다.

### 0. 기반 구축 (S1~S2, 약 2~3일)

- [ ] `backend/`에 Gradle Wrapper·Java 21·Boot 4.1.1 프로젝트와 위 의존성을 만든다. `./gradlew test`로 확인한다.
- [ ] PostgreSQL 버전을 고정하고 DB·환경 변수·`application.yml`을 구성한다. Flyway로 보호 `기타`의 첫 마이그레이션을 실행하고 `./gradlew bootRun`으로 확인한다.
- [ ] 공통 오류 응답·입력 검증·`/api/v1` 규칙과 Controller/Service/Repository 예제 한 건을 만든다. 잘못된 입력의 400 응답을 확인한다.

### 1. 가입 후 메뉴 탐색 (S3~S6, 약 1~2주)

- [ ] 회원가입 → 로그인 → 내 정보 조회·수정 → 로그아웃과 고객/관리자 접근 제어를 만든다. WBS 1.x; 본인·타인 접근 테스트로 확인한다.
- [ ] 첫 관리자 생성 절차와 관리자 회원 목록·상세·상태 변경을 만든다. WBS 2.x; 고객 정지·해제와 관리자 상태 변경 거부를 확인한다.
- [ ] 관리자 카테고리 등록·이름 수정·순서 변경·삭제를 만든다. WBS 13.x; `기타` 보호와 연결 메뉴 이동을 DB 제약·테스트로 확인한다.
- [ ] 관리자 메뉴 등록·목록·상세·수정·숨김과 방문자 목록·검색·상세·추천 메뉴를 만든다. WBS 3.x/4.x; `slug` 유일·숨김·옵션을 확인한다.

### 2. 장바구니에서 주문까지 (S7~S9, 약 1~2주)

- [ ] 메뉴 상세 → 장바구니 담기·조회·수량 변경·삭제를 만든다. WBS 14.1~14.4; 다른 기기에서 같은 회원의 결과를 확인한다.
- [ ] WBS 14.5의 품목 선택은 화면 상태로 두고 주문 요청의 `cartItemIds`로 전달한다. 체크 해제 항목이 DB에 그대로 남는지 확인한다.
- [ ] 선택 품목 주문 생성 → 내 주문 목록·상세 조회를 만든다. WBS 6.1/6.3/6.4; 금액·온도 재검증, 품목 스냅샷, 동시 수정·중복 제출을 테스트한다.

### 3. 주문서 확정과 관리자 처리 (S10~S11, 약 1주)

- [ ] 주문서의 매장/포장·`card`/`cash`·요청사항(최대 100자)을 주문 생성 API에 연결한다. 실제 청구 없이 `received`가 되는지 확인한다.
- [ ] 관리자 주문 목록·상세·상태 변경·`received` 취소를 만든다. WBS 5.x/12.x; 두 관리자의 버전 충돌과 허용되지 않은 상태 전이를 테스트한다.
- [ ] 회원 주문 상세에 관리자 상태 변경과 취소 결과를 반영한다. 다른 회원의 주문이 노출되지 않는지 확인한다.

### 4. 뮤직박스 (S12~S13, 약 1~2주)

- [ ] 회원 신청·목록·내 신청 조회·삭제와 홈 신청곡·현재 곡 조회를 만든다. WBS 11.x; 작성자 권한을 확인한다.
- [ ] 관리자 신청 목록·지난 선곡·취소·재생 목록 추가·순서·상태 변경을 만든다. WBS 10.1~10.6; 목록 순서 충돌을 확인한다.
- [ ] 지금 재생·완료·취소와 자동 다음 곡 전환을 만든다. WBS 10.7~10.9; 재생 중 곡 1개 제약과 전환 시각을 확인한다.

### 5. 프론트 연결과 인수 확인 (약 1주)

- [ ] 프론트의 목 저장소를 API 호출로 바꾸고 회원 → 메뉴 → 장바구니 → 주문서 → 주문 확인을 한 번에 실행한다. 기존 목 데이터는 이관하지 않는다.
- [ ] 관리자 카테고리·메뉴·주문·회원·뮤직박스 화면에서 변경 결과가 방문자·회원 화면에 반영되는지 확인한다.
- [ ] `./gradlew test`와 PostgreSQL 통합 테스트를 통과시킨 뒤, 기능별 작은 PR로 `develop`에 제안한다. 머지는 사람이 한다.

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
