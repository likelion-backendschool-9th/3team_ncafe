# 관리자 주문 팀 연동 재검토

> 아래는 2026-10-26 검토 기록이다. 취소 사유 제거를 포함한 당시 내용은 2026-10-27 [취소 사유 입력·회원 조회 연동](2026-10-27-order-cancellation-reason.md)으로 변경했다.

## 판정

DB 설계의 상태·취소·스냅샷 규칙과 3계층 방향은 일치한다. 최초 구현은 `develop`만 대상으로 검증해, 아직 머지되지 않은 A·D 코드와의 불일치를 놓쳤다. 재검토 후 아래 사항을 수정했다. 현재 결과는 지정한 팀원 커밋과의 호환성 검증이며 팀 전체 통합 완료를 의미하지 않는다.

## 발견 사항과 조치

| 발견 사항 | 영향 | 조치 |
| --- | --- | --- |
| 관리자 역할 `admin`과 A의 `ROLE_ADMIN` 불일치 | 실제 관리자가 403을 받을 수 있음 | Servlet 역할을 `ADMIN`으로 수정. 실제 로그인과 관리자 API 검증 |
| D와 `Order`·`OrderItem`·Repository가 독립 구현됨 | 생성 메서드·저장 필드·기존 조회/멱등성 메서드 충돌 | D의 생성 API, `idempotency_key`·`request_fingerprint`, 회원별 키 유니크, 기존 Repository 메서드를 보존한 공유 모델로 정리 |
| D와 `OrderPageResponse`·`OrderException` 이름 중복 | 다른 반환 타입·오류 enum 충돌 | 관리자 이름 `AdminOrderPageResponse`·`AdminOrderException` 사용 |
| 공통 `ApiExceptionHandler`에 관리자 주문 오류 추가 | A·D의 같은 파일 변경과 충돌하고 다른 도메인의 낙관적 잠금도 주문 오류로 표현 | 공통 파일 변경을 제거하고 관리자 주문 Controller에만 적용하는 별도 advice 사용 |

관리자 확장: `@Version`, 상태별 조회 인덱스, DB 체크 제약, 안정적인 품목 순서, 컬렉션 읽기 전용 getter, 인접 단계·접수 취소 메서드다. D의 `create(...)`, `addItem(...)`, `snapshot(...)` 호출부는 변경하지 않고 동작하도록 유지했다.

## 검증 범위

| 코드 | 검토한 기준 |
| --- | --- |
| A 인증 | `feature/session-auth`, `b932c5ad9342b0726e2a62fc35412142d0aa69fd` |
| D 고객 주문 | [PR #69](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/69), `feature/order-api`, `7098a1553499a0086be19a27de88927e9e06c0e1` |
| E 관리자 주문 | `feature/admin-orders`의 이번 수정 코드 |

- 이 브랜치 단독: 전체 105개 테스트 통과. DB 테스트 4개 포함, 실패·건너뜀 0.
- 임시 통합: A의 backend 및 테스트 의존성·Security 설정과 D의 신규 고객 주문 파일을 복사하고, 공유 모델/Repository에는 E의 호환 확장을 사용했다. 실제 Git merge나 팀원 브랜치 변경은 하지 않았다.
- 임시 통합 환경의 전체 244개 테스트 통과. D의 기존 서비스 테스트 10개와 E의 DB 동시성 검증도 포함한다.
- 추가 흐름: D 서비스로 장바구니 주문 생성 → 같은 멱등성 키 재요청 시 같은 주문 확인 → 주문 대상 항목 삭제 확인 → A 실제 관리자 로그인 → E 상세 조회 → CSRF 없는 변경 거절 → 유효한 CSRF로 상태 변경·버전 증가 → D 조회 서비스에서 변경 상태 확인 → 오래된 버전 재요청 409.
- 미인증 401·일반 회원 403도 실제 Security 필터를 거쳐 확인했다.

위 통합 실험은 PostgreSQL 16의 격리 DB·UUID 스키마를 사용했다. B 회원 브랜치·C 장바구니 CRUD·프론트는 조립 대상에 포함하지 않았다. A의 공통 advice를 사용했으며 A·D 사이의 공통 advice 통합은 별도다.

## 머지 전 남은 조건

1. **D 담당자의 공유 파일 리뷰:** `Order.java`, `OrderItem.java`, `OrderRepository.java`는 양쪽 브랜치가 추가한 같은 경로다. 호출 계약을 맞췄어도 Git의 add/add 충돌 가능성은 남는다. D의 멱등성/생성 기능과 E의 버전/상태 변경 확장을 모두 유지해야 한다. rebase 중 충돌하면 AGENTS.md에 따라 abort하고 사람에게 보고한다. 이 문서는 충돌을 임의로 해결하라는 지시가 아니다.
2. **회원 FK:** A·B의 User 통합 이후 `customer_id` FK를 연결한다. 현재는 D와 같은 scalar ID이며 DB가 회원 존재를 강제하지 않는다.
3. **고객 주문 HTTP 인증:** 현재 A의 SecurityConfig는 `/api/v1/admin/**`를 허용하지만 `/api/v1/orders`는 허용 목록에 없다. D의 `CurrentUserContext`도 실제 세션 구현이 필요하다. 이번 실험의 고객 생성·조회는 서비스 호출이며 전체 고객 HTTP 흐름을 검증한 것은 아니다.
4. **프론트:** 목 호출 교체, 숫자 ID, `temperature/iced`, `statusVersion`, `allowedStatuses`, 취소 사유 제거를 적용한 뒤 브라우저에서 확인한다.

기능별 테스트 통과만으로 팀원 코드의 향후 변경, 실제 머지 충돌, 배포 환경 및 전체 사용자 흐름에 오류가 없다고 보장할 수 없다. 공유 파일과 위 미통합 지점은 팀 리뷰 및 통합 후 검증 대상이다.
