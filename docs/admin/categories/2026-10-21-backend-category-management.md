# 관리자 카테고리 관리 백엔드 계획

## 한눈에

- 끝나면: 초기 관리자 계정으로 로그인해 카테고리 목록·등록·이름 수정·순서 변경·삭제 API를 사용할 수 있고, 삭제한 카테고리의 메뉴는 `기타`로 이동한다.
- 결정 필요: 없음. 아래 가정은 구현 전에 이 계획을 검토하며 조정할 수 있다.
- 규모: 5단계, 약 2~3일.
- 위치: 이 파일은 `docs/admin/categories/`의 백엔드 계획이다. 프론트엔드 계획은 같은 폴더에 별도 파일로 작성한다.

## 1. 초기 관리자 계정과 로그인 (R1)

회원가입 기능 없이 운영자가 제공한 이메일·비밀번호로 관리자 계정 한 개를 초기 설정하고 로그인·로그아웃할 수 있다.

S1 정상
- Given 빈 PostgreSQL DB와 환경 변수 `ADMIN_EMAIL=admin@example.com`, `ADMIN_PASSWORD`가 있다.
- When 일회성 관리자 초기 설정 명령을 실행한다.
- Then `users`에 `role=admin`, `status=active`인 계정 한 개가 생성되고 비밀번호는 해시로 저장된다.

S2 재실행
- Given `admin@example.com` 관리자 계정이 이미 있다.
- When 같은 초기 설정 명령을 다시 실행한다.
- Then 계정 수와 저장된 비밀번호 해시가 바뀌지 않는다.

S3 로그인
- Given S1에서 만든 관리자 계정이 있다.
- When 올바른 자격 증명으로 `POST /api/v1/auth/login`을 호출한다.
- Then 성공 응답과 서버 세션 쿠키가 발급된다.

S4 인증 실패
- Given `admin@example.com` 계정이 있다.
- When 틀린 비밀번호로 로그인한다.
- Then `401`을 반환하고 세션을 발급하지 않는다.

S5 로그아웃
- Given S3에서 발급받은 세션 쿠키가 있다.
- When `POST /api/v1/auth/logout`을 호출한다.
- Then 해당 세션으로 관리자 카테고리 API를 다시 호출할 때 `401`을 반환한다.

## 2. 관리자 접근 제어 (R2)

`/api/v1/admin/categories`의 조회와 변경은 로그인한 관리자만 수행할 수 있다.

S6 권한 실패
- Given 세션 쿠키가 없다.
- When `GET /api/v1/admin/categories`를 호출한다.
- Then `401`을 반환한다.

S7 권한 실패
- Given `role=customer` 계정으로 로그인했다.
- When `POST /api/v1/admin/categories`를 호출한다.
- Then `403`을 반환하고 카테고리를 생성하지 않는다.

## 3. 카테고리 목록과 기본 카테고리 (R3)

빈 DB에는 보호된 `기타` 카테고리 한 개를 초기화하고, 관리자는 카테고리를 표시 순서대로 조회할 수 있다.

S8 초기화
- Given 카테고리가 없는 DB다.
- When 애플리케이션 초기화를 두 번 실행한다.
- Then `is_fallback=true`, `name=기타`인 카테고리가 한 개만 존재한다.

S9 목록
- Given `커피`의 `displayOrder=1`, `차`의 `displayOrder=2`, `기타`의 `displayOrder=3`이다.
- When 관리자가 `GET /api/v1/admin/categories`를 호출한다.
- Then 세 항목을 `displayOrder` 오름차순으로 반환한다.

S10 메뉴 수
- Given `커피`에 연결된 메뉴 2개와 `기타`에 연결된 메뉴 1개가 있다.
- When 관리자가 카테고리 목록을 조회한다.
- Then 각 항목의 `menuCount`가 각각 2와 1이다.

## 4. 카테고리 등록과 이름 수정 (R4)

관리자는 공백을 제거한 1~40자 고유 이름으로 일반 카테고리를 등록하고 이름을 수정할 수 있다.

S11 등록
- Given `기타`만 등록되어 있다.
- When 관리자가 `POST /api/v1/admin/categories`에 `{"name":" 커피 "}`를 보낸다.
- Then `201`과 `name=커피`, `isFallback=false`인 항목을 반환하고 마지막 표시 순서에 저장한다.

S12 수정
- Given `id=10`, `name=커피`인 일반 카테고리가 있다.
- When 관리자가 `PUT /api/v1/admin/categories/10`에 `{"name":"라떼"}`를 보낸다.
- Then `200`과 `name=라떼`인 항목을 반환한다.

S13 이름 오류
- Given `커피` 카테고리가 있다.
- When 관리자가 공백만 있는 이름, 41자 이름 또는 중복된 `커피`를 등록하거나 수정한다.
- Then 검증 오류는 `400`, 중복은 `409`를 반환하고 저장된 목록은 유지된다.

S14 보호·누락
- Given `id=1`인 `기타`와 존재하지 않는 `id=999`가 있다.
- When 관리자가 각 ID의 이름을 수정한다.
- Then `기타`는 `409`, 없는 ID는 `404`를 반환한다.

## 5. 표시 순서 변경 (R5)

관리자는 카테고리 ID의 전체 배열을 보내 표시 순서를 한 번에 변경할 수 있다.

S15 정상
- Given 카테고리 순서가 `[커피(10), 차(11), 기타(1)]`다.
- When 관리자가 `PUT /api/v1/admin/categories/order`에 `{"orderedIds":[11,10,1]}`을 보낸다.
- Then `200`과 `[차(11), 커피(10), 기타(1)]`을 반환하고 순서가 DB에 저장된다.

S16 잘못된 순서
- Given 카테고리 ID가 `[10,11,1]`이다.
- When 관리자가 중복 ID, 없는 ID 또는 일부 ID가 빠진 `orderedIds`를 보낸다.
- Then `400` 또는 동시 변경을 나타내는 `409`를 반환하고 기존 순서를 유지한다.

S17 동시 변경
- Given 두 관리자가 같은 `[10,11,1]` 목록을 조회했다.
- When 한 관리자가 새 카테고리를 등록한 뒤 다른 관리자가 이전 세 ID로 순서를 변경한다.
- Then 두 번째 요청은 `409`를 반환하고 새 카테고리도 목록에 남는다.

## 6. 카테고리 삭제와 메뉴 이동 (R6)

일반 카테고리를 삭제하면 소속 메뉴를 `기타`로 옮기고 카테고리와 순서를 한 트랜잭션에서 정리한다.

S18 정상
- Given `커피(10)`에 메뉴 2개가 있고 `기타(1)`가 있다.
- When 관리자가 `DELETE /api/v1/admin/categories/10`을 호출한다.
- Then `204`를 반환하고 메뉴 2개의 `category_id=1`이며 `커피` 행은 없다.

S19 빈 카테고리
- Given `차(11)`에 연결된 메뉴가 없다.
- When 관리자가 `DELETE /api/v1/admin/categories/11`을 호출한다.
- Then `204`를 반환하고 남은 카테고리의 `displayOrder`는 빈칸 없이 이어진다.

S20 보호·누락
- Given `기타(1)`와 존재하지 않는 `id=999`가 있다.
- When 관리자가 각 ID를 삭제한다.
- Then `기타`는 `409`, 없는 ID는 `404`를 반환하며 메뉴 연결은 바뀌지 않는다.

S21 원자성
- Given `커피(10)`에 메뉴 2개가 있다.
- When 메뉴 이동 중 DB 오류가 발생한다.
- Then 카테고리 삭제와 메뉴 이동 모두 롤백된다.

## API 계약

| 관련 요구사항 | 경로 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| R1 | `POST /api/v1/auth/login` | `email`, `password` | `200`, 세션 쿠키 |
| R1 | `POST /api/v1/auth/logout` | 세션 쿠키 | `204` |
| R3 | `GET /api/v1/admin/categories` | 없음 | `200`, 카테고리 배열 |
| R4 | `POST /api/v1/admin/categories` | `name` | `201`, 카테고리 |
| R4 | `PUT /api/v1/admin/categories/{id}` | `name` | `200`, 카테고리 |
| R5 | `PUT /api/v1/admin/categories/order` | `orderedIds: number[]` | `200`, 정렬된 배열 |
| R6 | `DELETE /api/v1/admin/categories/{id}` | 없음 | `204` |

R3·R4·R5의 카테고리 응답 필드는 `id`, `name`, `displayOrder`, `isFallback`, `menuCount`, `createdAt`, `updatedAt`이다. `id`는 숫자이며 시각은 ISO 8601 문자열이다. R2·R4·R5·R6의 오류는 공통 형식 `{code, message}`로 반환한다. 변경 요청은 세션 인증과 CSRF 검사를 거친다.

## 범위 밖

- 고객 회원가입·고객 인증 흐름, 관리자 추가 생성·관리 화면.
- 메뉴 등록·수정·숨김 API와 카테고리 화면의 프론트엔드 API 연결. 단, R3·R6 검증에 필요한 메뉴 FK와 테스트 데이터는 포함한다.
- 공개 메뉴 카테고리 필터 API `GET /api/v1/menus/categories`. 메뉴 조회 계획에서 다룬다.
- 기존 프론트엔드 목 데이터 이관 및 기본 카테고리 여러 개 자동 생성.

## 작업 순서

1. 카테고리 저장·초기화·목록 구축 — S8~S10
   - 파일: `backend/src/main/java/com/newcafe/backend/{entity/Category.java,repository/CategoryRepository.java,controller/admin/CategoriesController.java,service/admin/CategoriesService.java,dto/categories/*,config/PluralTableNamingStrategy.java}`, `backend/src/main/resources/application.yml`, 보호 `기타` 초기화 및 관련 테스트.
   - 확인: `cd backend && ./gradlew test --tests '*Categories*'`.
2. 등록·수정과 이름 제약 구축 — S11~S14
   - 파일: 단계 1의 Controller·Service·DTO·Repository와 입력·DB 제약 테스트.
   - 확인: `cd backend && ./gradlew test --tests '*Categories*'`.
3. 순서 변경과 동시성 구축 — S15~S17
   - 파일: 단계 1의 Service·Repository, PostgreSQL 순서 유일 제약 및 통합 테스트.
   - 확인: `cd backend && ./gradlew test --tests '*Categories*'`.
4. 삭제·메뉴 이동 구축 — S18~S21
   - 파일: `backend/src/main/java/com/newcafe/backend/{entity/Menu.java,repository/MenuRepository.java}`의 최소 FK 모델, 카테고리 Service·통합 테스트.
   - 확인: PostgreSQL 테스트 DB에서 `cd backend && ./gradlew test`.
5. 초기 관리자와 인증 경로 구축 — S1~S7
   - 파일: `backend/build.gradle`, `backend/src/main/java/com/newcafe/backend/{entity/User.java,repository/UserRepository.java,controller/AuthController.java,service/AuthService.java,common/security/*}`, 관련 DTO·테스트.
   - 확인: `cd backend && ./gradlew test --tests '*Auth*' --tests '*Security*'`.

각 S 번호에 대응하는 테스트를 하나 이상 둔다. 특히 S8·S15~S21은 실제 PostgreSQL에서 제약과 트랜잭션을 확인한다.

## 브랜치·커밋

- 브랜치: `feature/admin-category-menu-management`.
- 계획 문서 커밋: `docs: 관리자 카테고리 백엔드 계획 추가`.
- 구현 시 논리적 단위에 맞춰 인증·카테고리 저장·순서·삭제를 각각 커밋한다. PR 대상은 `develop`이며 머지는 사람이 수행한다.

## 가정

- R1: 관리자 계정은 기존 설계의 `users` 테이블에 `role=admin`으로 저장한다. 일회성 초기 설정 명령은 환경 변수에서 자격 증명을 읽고, 이미 같은 이메일이 있으면 변경하지 않는다.
- R1·R2: 현재 백엔드에는 인증 코드가 없으므로 카테고리 Controller·Service 다음 단계에서 관리자 로그인에 필요한 최소 세션 인증·로그아웃·CSRF 처리를 만든다. 회원가입 API는 만들지 않는다. (고침 10-21: 사용자가 인증은 다음 단계로 진행하기로 결정)
- R3: `기타`는 초기 상태에서 `displayOrder=1`이고, 이후 일반 카테고리와 함께 순서를 바꿀 수 있다. 이름과 삭제만 보호한다.
- R3: `menuCount`는 숨김 메뉴까지 포함한 연결 메뉴 수다. 메뉴를 하나의 카테고리에만 연결하는 DB 설계를 따른다.
- R4: 이름 비교는 앞뒤 공백 제거 후 정확히 일치하는 문자열 기준이다. 대소문자·유니코드 정규화는 추가하지 않는다.
- R5: 순서 API는 현재 카테고리 ID를 빠짐없이 한 번씩 받은 경우에만 적용한다. 기존 프론트 목 저장소의 누락 ID 자동 추가 동작은 API 연결 때 변경한다.
- R6: 삭제 시 메뉴 이동과 카테고리 제거는 단일 트랜잭션이며, 목록 순서는 1부터 다시 매긴다.

## 참고

- 2026-10-21 확인: [DB 설계](../../database-design.md)는 이름·순서 유일, 보호 `기타`, 메뉴 이동 트랜잭션을 정한다.
- 2026-10-21 확인: [백엔드 청사진](../../../backend/docs/2026-10-20-backend-blueprint.md)은 관리자 카테고리 API와 Controller → Service → Repository 구조를 정한다.
- 2026-10-21 확인: `frontend/app/admin/categories/`는 이름 1~40자, 이동 버튼·드래그, `기타` 수정·삭제 금지와 메뉴 수 표시를 사용한다.
- 2026-10-21 확인: `backend/src/main/java`에는 실행용 메인 클래스만 있어 인증·카테고리·메뉴 엔티티는 아직 없다.
