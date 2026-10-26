# 주문 API 연계 메모

## 구현 범위

- `POST /api/v1/orders`: 장바구니 항목 ID, 주문 유형, 카운터 결제수단, 요청사항, 선택 입력인 예상 총액을 받습니다.
- `GET /api/v1/orders?page=0&size=20`: 현재 회원의 주문만 최신순으로 반환합니다. 페이지 번호는 0부터 시작하고 크기는 1~100입니다.
- `GET /api/v1/orders/{id}`: 현재 회원 소유 주문만 반환하며 다른 회원 주문과 없는 주문은 같은 404 응답을 냅니다.
- 생성 요청에는 `Idempotency-Key` 헤더(출력 가능한 ASCII 1~100자)가 필요합니다. 회원별 키와 요청 지문을 저장하고 PostgreSQL 트랜잭션 advisory lock 및 유니크 제약으로 동시 재전송을 직렬화합니다. 같은 키와 같은 내용은 기존 주문을 돌려주며, 같은 키에 다른 내용은 409입니다.

## 인증 연결

회원 ID는 경로·쿼리·본문에서 받지 않습니다. 컨트롤러는 `CurrentUserContext.requireCurrentUser()` 경계만 사용합니다. 현재 저장소에는 로그인 구현이 없어 기본 구현은 인증되지 않은 요청에 401을 반환합니다. 인증 담당자는 로그인 회원의 ID와 이름 스냅샷을 제공하는 `CurrentUserContext` Bean을 등록하면 주문 코드를 변경하지 않고 연결할 수 있습니다.

## 장바구니 연결

현재 주문 API는 DB 설계의 `cart_items` 컬럼(`id`, `user_id`, `menu_id`, `temperature`, `quantity`)을 읽는 최소 JPA 매핑만 포함합니다. 장바구니 CRUD는 포함하지 않습니다. 장바구니 담당자는 같은 테이블 매핑을 재사용하고, 주문 확정과 수량 변경/삭제가 회원 행 잠금을 사용하게 되면 같은 회원의 변경 경계를 맞춰야 합니다. 현재 주문은 선택 장바구니 줄과 메뉴 행을 잠근 뒤 주문 저장 및 선택 줄 제거를 한 트랜잭션에서 처리합니다.

`customer_id`와 `cart_items.user_id`는 사용자 엔티티가 아직 없어 현재 scalar ID로 매핑되어 있습니다. 사용자 팀이 `users` 엔티티/FK를 추가할 때 두 컬럼에 FK를 연결해야 합니다. 기존 DB 데이터 삭제나 초기화는 하지 않습니다.

## PostgreSQL 검증

멱등성 동시성 제어는 PostgreSQL의 `pg_advisory_xact_lock`을 사용합니다. 실제 DB 테스트는 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`가 제공되는 개발 환경에서 수행해야 합니다. 이 주문 기능은 운영 스키마에서 `ddl-auto=create` 또는 `create-drop`을 요구하지 않습니다.
