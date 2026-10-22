# 관리자 메뉴 관리 백엔드 계획

## 한눈에

- 끝나면: `/api/v1/admin/menus`에서 메뉴 목록(검색·필터·정렬·페이지)·상세·등록·수정·삭제(숨김)를 쓸 수 있고, 단위·MockMvc 테스트가 통과한다.
- 결정 필요: 없음 (온도 옵션 없음 허용, 숨김 메뉴는 관리자에게도 안 보임, page·size 페이지네이션 — 10-22 사용자 답변)
- 규모: 6단계, 약 5~7시간
- 현재 (10-22): 1~6단계 완료. 목록·상세·등록·수정·삭제 API와 MockMvc·단위 테스트(S1~S19) 통과. PostgreSQL 통합 검증과 관리자 인증은 남음.
- 위치: `docs/admin/menus/`의 백엔드 계획. 카테고리 계획(`docs/admin/categories/2026-10-21-backend-category-management.md`)의 구현 기준 1~8을 그대로 따른다.

## 1. 메뉴 등록 (R1)

관리자는 카테고리 하나와 slug·이름·설명·이미지·가격·판매 상태·태그·온도 옵션을 보내 메뉴를 등록할 수 있다.

S1 정상
- Given `커피(10)` 카테고리가 있다.
- When `POST /api/v1/admin/menus`에 `{"categoryId":10,"slug":"americano","name":" 아메리카노 ","description":"진한 커피","imageUrl":"/images/menus/coffee.png","price":4500,"available":true,"isNew":false,"recommended":true,"supportsHot":true,"supportsIced":true}`를 보낸다.
- Then `201`과 `name=아메리카노`, `categoryName=커피`, `createdAt`이 있는 메뉴를 반환한다.

S2 온도 옵션 없음
- Given `다과(12)` 카테고리가 있다.
- When `supportsHot=false`, `supportsIced=false`로 `모나카`를 등록한다.
- Then `201`과 두 값이 모두 `false`인 메뉴를 반환한다.

S3 입력 오류
- Given `커피(10)` 카테고리가 있다.
- When `slug`가 `Ameri Cano`, 이름이 공백만, 81자 이름, 501자 설명, `price=0`, `http://` 이미지, boolean 누락 중 하나로 등록한다.
- Then `400`과 `{code, message}`를 반환하고 메뉴는 저장되지 않는다.

S4 slug 중복
- Given `americano` slug 메뉴가 있다 (숨김 메뉴 포함).
- When 같은 slug로 등록한다.
- Then `409`를 반환한다.

S5 없는 카테고리
- Given `id=999` 카테고리가 없다.
- When `categoryId=999`로 등록한다.
- Then `400`을 반환하고 메뉴는 저장되지 않는다.

## 2. 메뉴 목록 (R2)

관리자는 숨기지 않은 메뉴를 검색어·카테고리·판매 상태로 거르고 정렬해 페이지 단위로 조회할 수 있다.

S6 기본 목록
- Given 숨기지 않은 메뉴 25개와 숨긴 메뉴 1개가 있다.
- When `GET /api/v1/admin/menus`를 호출한다.
- Then `200`과 최신 등록순 20개, `page=0`, `size=20`, `totalElements=25`, `totalPages=2`를 반환한다.

S7 다음 페이지
- When `GET /api/v1/admin/menus?page=1&size=20`을 호출한다.
- Then 나머지 5개를 반환한다.

S8 검색·필터
- Given `아메리카노(커피, 판매 중)`, `카페라떼(커피, 판매 중지)`, `모나카(다과, 판매 중)`가 있다.
- When `?q=라떼&categoryId=10&status=unavailable`로 조회한다.
- Then `카페라떼` 1개만 반환한다.

S9 slug 검색
- When `?q=AMERI`로 조회한다.
- Then slug가 `americano`인 메뉴를 반환한다 (대소문자 무시, 이름·slug 부분 일치).

S10 정렬
- Given 가격이 3000, 4500, 5000인 메뉴가 있다.
- When `?sort=price-high`로 조회한다.
- Then 5000, 4500, 3000 순서로 반환한다. (`newest`, `oldest`, `name`, `price-low`, `price-high` 지원)

S11 잘못된 조건
- When `sort=cheap`, `status=sold`, `page=-1`, `size=0`, `size=101` 중 하나로 조회한다.
- Then `400`을 반환한다.

## 3. 메뉴 상세 (R3)

관리자는 ID로 숨기지 않은 메뉴 한 건을 조회할 수 있다.

S12 정상
- Given `id=5`인 `아메리카노`가 있다.
- When `GET /api/v1/admin/menus/5`를 호출한다.
- Then `200`과 메뉴 응답 필드 전체를 반환한다.

S13 없음·숨김
- Given `id=999`는 없고 `id=6`은 숨긴 메뉴다.
- When 각 ID를 조회한다.
- Then 둘 다 `404`를 반환한다.

## 4. 메뉴 수정 (R4)

관리자는 slug를 뺀 모든 필드를 한 번에 바꿀 수 있고 slug는 바뀌지 않는다.

S14 정상
- Given `id=5`, `커피(10)`, `price=4500`인 `아메리카노`가 있다.
- When `PUT /api/v1/admin/menus/5`에 `categoryId=12`, `price=5000`, `available=false`와 나머지 필드를 보낸다.
- Then `200`과 `categoryName=다과`, `price=5000`, `available=false`를 반환하고 `updatedAt`이 바뀐다.

S15 slug 고정
- When 같은 요청에 `"slug":"new-slug"`를 함께 보낸다.
- Then `200`과 `slug=americano`를 반환한다.

S16 실패
- Given `id=5` 메뉴와 숨긴 `id=6` 메뉴가 있다.
- When `id=5`에 S3의 잘못된 값이나 없는 `categoryId=999`를 보내고, `id=6`·`id=999`에 정상 값을 보낸다.
- Then 각각 `400`, `400`, `404`, `404`를 반환하고 저장된 값은 그대로다.

## 5. 메뉴 삭제(숨김) (R5)

관리자가 메뉴를 삭제하면 행을 지우지 않고 `available=false`, `archived_at=now()`로 숨긴다.

S17 정상
- Given `id=5` 메뉴가 판매 중이다.
- When `DELETE /api/v1/admin/menus/5`를 호출한다.
- Then `204`를 반환하고 DB 행은 남아 `available=false`, `archived_at`이 채워진다.

S18 숨긴 뒤
- Given S17로 숨긴 `id=5`가 있다.
- When 목록·상세 조회와 다시 삭제를 호출한다.
- Then 목록에 없고, 상세와 재삭제는 `404`다.

S19 카테고리 메뉴 수 (R5·카테고리 R3)
- Given `커피(10)`에 메뉴 2개가 있고 그중 1개를 숨겼다.
- When `GET /api/v1/admin/categories`를 호출한다.
- Then `커피`의 `menuCount=2`다 (카테고리 계획의 가정: 숨김 포함).

## API 계약

| 요구사항 | 경로 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| R1 | `POST /api/v1/admin/menus` | `MenuCreateRequest` | `201`, 메뉴 |
| R2 | `GET /api/v1/admin/menus` | `q`, `categoryId`, `status`, `sort`, `page`, `size` | `200`, 페이지 |
| R3 | `GET /api/v1/admin/menus/{id}` | 없음 | `200`, 메뉴 |
| R4 | `PUT /api/v1/admin/menus/{id}` | `MenuUpdateRequest` (slug 없음) | `200`, 메뉴 |
| R5 | `DELETE /api/v1/admin/menus/{id}` | 없음 | `204` |

- 메뉴 응답: `id`, `slug`, `name`, `description`, `imageUrl`, `price`, `categoryId`, `categoryName`, `available`, `isNew`, `recommended`, `supportsHot`, `supportsIced`, `createdAt`, `updatedAt`.
- 페이지 응답: `items`, `page`, `size`, `totalElements`, `totalPages`.
- 오류: 공통 `{code, message}`. 입력 오류 `400`, 없음·숨김 `404`, slug 중복 `409`.

## 범위 밖

- 관리자 인증·권한 (S401/403): 카테고리 계획 R1·R2에서 함께 만든다. 인증이 생기면 메뉴 API에도 같은 규칙을 적용한다.
- 이미지 파일 업로드. 이 API는 `imageUrl` 문자열만 받는다.
- 숨긴 메뉴 복구·숨김 메뉴 조회 API.
- 공개 메뉴 API(`GET /api/v1/menus`, `/menus/{slug}`), 장바구니·주문의 숨김 메뉴 처리.
- 프론트엔드 연결 (영문명 제거, slug 입력, `ice`→`iced`, 숫자 ID). 별도 계획.

## 작업 순서

1. 계획 문서 저장 — 전체
   - 파일: `docs/admin/menus/2026-10-22-backend-menu-management.md`
   - 커밋: `docs: 관리자 메뉴 백엔드 계획 추가`
2. Entity·DTO·오류 — S1, S2, S3
   - 파일: `entity/menu/Menu.java`·`MenuDetails.java`·`MenuFields.java` (필드·`create`·`update`·`archive`, `@PrePersist`/`@PreUpdate`는 `Category.java` 패턴), `dto/menus/MenuCreateRequest·MenuUpdateRequest·MenuResponse·MenuPageResponse.java`, `common/error/MenuException.java`, `ApiExceptionHandler.java`에 매핑 추가
   - 입력 정규화는 `CategoryName.normalize`처럼 trim 후 Bean Validation (기준 2).
   - 확인: `cd backend && ./gradlew compileJava`
3. 등록·상세 — S1~S5, S12, S13
   - 파일: `controller/admin/MenusController.java` (`@RestController("adminMenusController")`), `service/admin/MenusService.java` (`@Service("adminMenusService")`), `repository/MenuRepository.java`에 `existsBySlug`, `findByIdAndArchivedAtIsNull`
   - 테스트: `controller/admin/MenusControllerTest.java`, `service/admin/MenusServiceTest.java` (카테고리 테스트 구조 그대로)
   - 확인: `./gradlew test --tests '*MenusController*' --tests '*MenusService*'`
4. 수정 — S14~S16
   - 확인: 3단계와 같은 명령
5. 삭제(숨김) — S17~S19
   - S19는 기존 `countByCategory` 동작 확인 테스트만 추가
   - 확인: 3단계와 같은 명령
6. 목록 검색·필터·정렬·페이지 — S6~S11
   - `MenuRepository`에 `JpaSpecificationExecutor<Menu>` 추가. null 파라미터 JPQL은 PostgreSQL 타입 추론 오류가 나므로 Specification으로 조건을 조합한다.
   - 확인: `./gradlew test` 전체 통과

## 브랜치·커밋

- 브랜치: `feature/admin-category-menu-management` (현재 브랜치에서 계속)
- 커밋: 단계 1~6을 각각 한 커밋. 예: `feat: 관리자 메뉴 등록·상세 API 추가`, `feat: 관리자 메뉴 목록 검색 추가`
- PR 대상은 `develop`, 머지는 사람이 한다.

## 가정

- R1: slug는 `^[a-z0-9]+(-[a-z0-9]+)*$`, 1~100자. 숨긴 메뉴의 slug도 재사용하지 않는다 (DB 설계).
- R1: 이름 1~80자, 설명 1~500자 (프론트 폼 기준). 이름은 중복 허용.
- R1: `imageUrl`은 필수, 2048자 이하, `https://` 또는 `/images/menus/…` 경로. 빈 값이면 프론트가 placeholder를 보낸다.
- R1: `price`는 1~1,000,000 정수(원).
- R1·R4: 요청 본문의 없는 `categoryId`는 경로 자원이 아니므로 `404`가 아닌 `400`.
- R2: `size` 기본 20, 최대 100. `page`는 0부터. `q`는 trim 후 100자까지 이름·slug 부분 일치(대소문자 무시).
- R2: `status`가 없으면 판매 중·판매 중지 모두. 숨긴 메뉴는 항상 제외 (10-22 답변).
- R4: 동시 수정은 마지막 요청이 이긴다. 메뉴 단위 수정이라 카테고리처럼 잠금을 쓰지 않는다 (기준 5). slug 동시 등록은 DB 유일 제약 → 기존 `DataIntegrityViolationException` 처리로 `409`.
- R4: 카테고리 삭제와 메뉴 등록이 겹쳐 FK 위반이 나면 같은 처리로 `409`.
- 예외: `CategoryException`을 재사용하지 않고 `MenuException`을 따로 둔다 (기준 3).

## 참고

- 2026-10-22 확인: `Menu.java`는 `id`, `category`만 있고 `new Menu(...)` 사용처가 없어 생성자를 바꿔도 다른 코드가 깨지지 않는다.
- 2026-10-22 확인: `docs/database-design.md`의 `menus` 컬럼·제약 (slug 유일·불변, `price > 0`, 삭제는 숨김).
- 2026-10-22 확인: `backend/docs/2026-10-20-backend-blueprint.md`의 `admin/MenusController` 경로와 Bean 이름 규칙.
- 2026-10-22 확인: `frontend/app/admin/menus/`는 `q`·카테고리·상태·5가지 정렬과 이름 80자·설명 500자·가격 1원 이상 검증을 쓴다. 목 데이터의 다과 3종은 온도 옵션이 없다.
