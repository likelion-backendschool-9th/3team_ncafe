# 관리자 주문 관리 백엔드 계획 및 구현

## 범위와 현재 상태

담당 E의 관리자 주문 목록·상세·상태 변경·취소 API를 구현했다. 기준은 [DB 설계](../../database-design.md), [백엔드 청사진](../../../backend/docs/2026-10-20-backend-blueprint.md), [프론트 문서](../../FRONTEND.md)와 `frontend/app/admin/orders/`의 화면 흐름이다. 최초 지시서의 배달·기사 기능은 현재 범위에 포함하지 않는다.

제공된 분담 이미지의 작업 단위:

| 담당 | 기능 |
| --- | --- |
| A | 회원가입·로그인·로그아웃 |
| B | 내 정보·관리자 회원 |
| C | 공개 메뉴·홈·장바구니 |
| D | 주문 생성·내 주문 |
| **E** | **관리자 주문** |
| F | 곡 신청·내 신청곡 (+ 숨은 API 3개, 이미지에는 세부 명세 없음) |
| G | 관리자 선곡·재생 |

프론트 API 연결, 회원·인증, 고객 주문 API는 아직 구현하지 않았다. A·B·D 담당과 아래 공유 계약을 통합한 뒤 실제 로그인 → 주문 생성 → 관리자 처리 → 고객 확인을 검증해야 한다. 현재 기능 완료는 백엔드 API·저장 구조와 자동 테스트 기준이다.

## 작업 순서와 완료 기준

카테고리 계획의 구현 기준 1~8을 따른다. Controller는 요청·권한 경계와 DTO 검증, Service는 트랜잭션·조회, Entity는 상태 이동 규칙, Repository는 DB 조회를 맡는다. Service에 HTTP 객체를 전달하거나 Entity를 API 응답으로 직접 반환하지 않는다.

1. [x] 기존 계획·화면·분담 확인: E의 목록·상세·상태 변경·취소로 범위를 정리한다.
2. [x] 공유 저장 구조: `Order`·`OrderItem`에 주문 당시 스냅샷, 금액·온도 제약, `status_version`과 조회 인덱스를 둔다.
3. [x] 관리자 API: 지정된 Controller/Service 이름, 공통 오류 형식, 검색·필터·정렬·페이지 DTO를 적용한다.
4. [x] 변경 규칙: 인접 단계, 접수 취소, 예상 상태·버전 검사와 DB 동시 변경을 검증한다.
5. [x] 자동 검증: 단위·MockMvc 테스트와 별도 임시 PostgreSQL에서 전체 테스트를 실행한다. 청사진의 Testcontainers 대신 이 환경에 설치된 PostgreSQL 16을 사용해 새 테스트 의존성 없이 실제 DB를 검증했다. 재실행은 아래 환경 변수 방식이다.
6. [ ] 팀 통합: A의 인증·CSRF, B의 회원 FK, D의 주문 생성·고객 조회와 연결한다.
7. [ ] 화면 통합: 별도 프론트 작업에서 목 API 교체 후 관리자 변경 결과를 고객 화면에서 확인한다.

## API 계약

| 메서드·경로 | 요청 | 결과 |
| --- | --- | --- |
| `GET /api/v1/admin/orders` | `q`, `status`, `group`, `sort`, `page`, `size` | 주문 페이지 |
| `GET /api/v1/admin/orders/{id}` | 숫자 ID | 주문 상세 |
| `PUT /api/v1/admin/orders/status` | 아래 JSON | 변경 후 주문 상세 |

```json
{"id":1,"expectedStatus":"received","statusVersion":0,"nextStatus":"preparing"}
```

- `q`: trim 후 최대 100자. 주문번호·주문 당시 고객명·주문 당시 메뉴명 부분 검색, 영문 대소문자 무시. `%`, `_`, `\`는 일반 문자로 검색한다.
- `status`: `received`, `preparing`, `ready`, `completed`, `canceled` 중 하나. 생략하면 전체.
- `group`: `active`(접수·준비 중·준비 완료), `completed`, `canceled`. 상태 필터와 함께 쓰면 교집합이다. 화면의 세 섹션은 각 `group`과 해당 페이지를 보내 독립 조회한다.
- `sort`: `newest`(기본), `oldest`. 생성 시각·ID를 같은 방향으로 정렬한다.
- `page`: 0부터, 기본 0. `size`: 기본 20, 1~100. 화면의 10개 단위 조회는 `size=10`을 지정한다.
- 페이지: `{items, page, size, totalElements, totalPages}`. 헤더의 전체·처리 중·완료·취소 건수는 검색어 없이 전체/각 group 조회의 `totalElements`로 얻을 수 있다.
- 주문: `id`, `customerId`, `customerName`, `orderType`, `paymentMethod`, `request`, `status`, `statusVersion`, `totalAmount`, `items`, `allowedStatuses`, `createdAt`, `updatedAt`.
- 품목: `id`, `menuId`, `menuName`, `imageUrl`, `temperature`, `quantity`, `unitPrice`, `lineTotal`. ID는 숫자, 금액은 원 단위 정수, 시각은 ISO 8601이다.
- 목록도 품목 스냅샷을 반환해 리스트·그리드 두 보기를 지원한다. 페이지 조회와 해당 주문의 품목 일괄 조회를 분리해 컬렉션 fetch join의 메모리 페이지 처리와 품목 N+1 조회를 피한다.

## 상태·취소·충돌

- `received ↔ preparing ↔ ready ↔ completed`에서 인접 단계로만 이동한다. 완료 주문은 준비 완료로 되돌릴 수 있다.
- 취소는 같은 `PUT /status`에 `nextStatus=canceled`를 보낸다. `received`에서만 허용하고 취소 사유는 받거나 저장하지 않는다. 취소 후 다른 상태로 바꿀 수 없다.
- 모든 변경에 현재 `expectedStatus`와 `statusVersion`이 필수다. 상태가 되돌아왔더라도 버전이 다르면 거부한다.
- JPA `@Version`으로 동시 변경을 감지한다. 명시적 `flush()`로 갱신된 버전을 응답에 넣고 DB 충돌을 확인한다. 충돌한 트랜잭션은 롤백된다.
- 오류는 `{code, message}`. 검증/형식 오류 `400`, `UNAUTHORIZED` `401`, `FORBIDDEN` `403`, `NOT_FOUND` `404`, `INVALID_STATUS`·`STALE_STATUS` `409`다.

## 팀 간 공유 계약과 남은 통합

1. **A(인증):** Controller는 Servlet `getUserPrincipal()`과 `isUserInRole("admin")`을 검사한다. 인증 구현 전에는 정상 요청도 `401`로 차단한다. 인증 담당은 검증된 로그인 정보로 principal과 역할을 연결하거나 이 검사를 팀의 공통 권한 검사로 교체해야 한다. Spring Security의 기본 `ROLE_` 접두사를 사용한다면 Servlet 역할 `admin`과 실제 authority의 매핑도 확인한다. 프론트 목 쿠키, 임의 헤더·요청 본문의 역할 값은 신뢰하지 않는다. 실제 로그인·로그아웃·세션/CSRF 검증은 A 연동 후 수행한다.
2. **B(회원):** 아직 `User` 엔티티가 없어 `customer_id`는 `Long` 필드다. 회원 엔티티 통합 시 `users` FK 또는 `@ManyToOne`을 추가해야 한다. 현재 DB가 회원 존재·역할·정지 상태를 검증하지는 않는다. `customer_name_snapshot`은 주문 당시 이름으로 유지한다.
3. **D(주문):** `entity/order/Order`, `OrderItem`, `OrderRepository`를 공유하며 새 주문 테이블을 중복 생성하지 않는다. `OrderItem.snapshot(menu, temperature, quantity)` 후 `Order.create(customerId, customerName, orderType, paymentMethod, request, items)`와 `save`를 사용한다. `received`·버전 0으로 저장되고 총액은 품목 합으로 계산된다. 소유권·현재 판매 상태·예상 금액·중복 요청 검증과 장바구니 삭제는 D 서비스의 한 트랜잭션에서 처리해야 한다. 이 팩토리만으로 주문 생성 API의 검증이 완성되는 것은 아니다.
4. **프론트:** 인증·D 연동 이후 목 호출을 교체한다. 문자열 ID→숫자, `option`/`ice`→`temperature`/`iced`, `statusVersion` 전달, 서버 `allowedStatuses` 사용, 취소 사유 폼 제거와 `received`만 취소를 반영한다. 고객·관리자 목록/상세와 `/admin` 캐시를 갱신한다.

품목은 변경 메서드 없이 불변 스냅샷으로 저장한다. 메뉴 숨김 후에도 당시 이름·이미지·온도·단가·수량·합계가 유지된다. 실제 결제·고객 취소·배달 API는 범위 밖이다.

## 검증

- `OrderTest`: 25개 상태 이동 조합, 같은 상태로 돌아온 후의 버전 충돌, 스냅샷·합계·품목 재사용 방지, 잘못된 온도·수량.
- `OrdersControllerTest`: 관리자 조회·변경, 미인증·일반 회원 차단, 페이지 응답, 검증·누락·상태 충돌·DB 낙관적 잠금 오류 매핑.
- `OrdersPostgresTest`: 실제 PostgreSQL에서 스키마 생성, ID·고객명·품목명 검색, 와일드카드 이스케이프, 중복 없는 페이지·필터, 메뉴 변경·숨김 후 스냅샷, 버전 증가, 두 동시 트랜잭션 중 한 건만 성공.

기본 실행: `cd backend && ./gradlew test`.

DB 테스트는 `ORDER_TEST_DB_URL`이 없으면 건너뛴다. 지정하면 임의 이름의 `orders_test_<UUID>` 스키마를 만들고 테스트 후 제거한다. 해당 DB 계정에 스키마 생성 권한이 필요하다. 테스트용 DB에서 아래처럼 실행한다.

```bash
ORDER_TEST_DB_URL=jdbc:postgresql://localhost:5432/ncafe_test \
ORDER_TEST_DB_USERNAME=postgres ORDER_TEST_DB_PASSWORD=... \
./gradlew test --rerun-tasks
```

2026-10-26 검증: 별도 임시 PostgreSQL 16 인스턴스에서 기존 테스트를 포함한 전체 테스트 통과. 실제 프론트·인증·고객 주문 연동은 미검증이다.

브랜치: `feature/admin-orders`. PR 대상: `develop`. 머지는 사람이 수행한다.
