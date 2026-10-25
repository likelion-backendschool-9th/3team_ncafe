# 공개 메뉴·홈 백엔드 계획

## 한눈에

- 끝나면: 로그인 없이 `/api/v1/menus`에서 메뉴 목록(검색·카테고리·정렬·페이지)·필터용 카테고리·slug 상세를, `/api/v1/index/menus`에서 홈 추천 메뉴를 받을 수 있고, 단위·MockMvc 테스트가 통과한다.
- 결정 필요: 없음 (아래 가정으로 진행하고 PR에 적는다)
- 규모: 5단계
- 현재 (10-25): 1~5단계 완료. 목록·필터용 카테고리·상세·홈 추천 API와 MockMvc·단위 테스트(S1~S11) 통과. 실제 PostgreSQL에서는 카테고리 조회만 확인했고, 메뉴 조회는 개발 DB의 `menus` 테이블 정리 후 확인한다. 프론트 연결(6단계)은 별도 PR.
- 위치: `docs/menus/`의 백엔드 계획.

## 1. 공개 메뉴 목록 (R1)

방문자는 숨기지 않은 메뉴를 검색어·카테고리·판매 상태로 거르고 정렬해 페이지 단위로 볼 수 있다. 판매 중지 메뉴도 목록에 나온다(화면이 `품절`로 표시).

S1 기본 목록
- Given 숨기지 않은 메뉴 25개(판매 중지 1개 포함)와 숨긴 메뉴 1개가 있다.
- When `GET /api/v1/menus`를 호출한다.
- Then `200`과 최신 등록순 20개, `page=0`, `size=20`, `totalElements=25`, `totalPages=2`를 반환한다. 숨긴 메뉴는 없다.

S2 검색·필터
- Given `아메리카노(커피, 판매 중)`, `카페라떼(커피, 판매 중지)`, `모나카(다과, 판매 중)`가 있다.
- When `?q=라떼&categoryId=10`으로 조회한다.
- Then `카페라떼` 1개를 반환한다 (이름·slug 부분 일치, 대소문자 무시).

S3 정렬
- Given 가격이 3000, 4500, 5000인 메뉴가 있다.
- When `?sort=price-low`로 조회한다.
- Then 3000, 4500, 5000 순서로 반환한다. (`newest`, `oldest`, `name`, `price-low`, `price-high` 지원)

S4 잘못된 조건
- When `sort=cheap`, `status=sold`, `page=-1`, `size=0`, `size=101`, 101자 `q` 중 하나로 조회한다.
- Then `400`과 `{code, message}`를 반환한다.

## 2. 필터용 카테고리 (R2)

방문자는 메뉴 필터 버튼에 쓸 카테고리 이름을 관리자가 정한 순서대로 받는다.

S5 정상
- Given `커피(순서 1)`, `차(순서 2)`, `기타(순서 3)`가 있다.
- When `GET /api/v1/menus/categories`를 호출한다.
- Then `200`과 `[{id, name}]`을 순서 1, 2, 3으로 반환한다. 메뉴 수·`기타` 여부·시각은 없다.

S6 경로 우선순위
- When `GET /api/v1/menus/categories`를 호출한다.
- Then 메뉴 상세(R3)가 아니라 카테고리 목록이 응답한다.

## 3. 메뉴 상세 (R3)

방문자는 slug로 숨기지 않은 메뉴 한 건을 조회한다. 판매 중지 메뉴도 열리고 `available=false`로 내려간다(담기는 장바구니 API가 막는다).

S7 정상
- Given slug `americano`인 메뉴가 있다.
- When `GET /api/v1/menus/americano`를 호출한다.
- Then `200`과 메뉴 응답 필드 전체를 반환한다.

S8 판매 중지
- Given slug `cafe-latte`가 판매 중지다.
- When 상세를 조회한다.
- Then `200`과 `available=false`를 반환한다.

S9 없음·숨김
- Given slug `unknown`은 없고 `old-menu`는 숨긴 메뉴다.
- When 각 slug를 조회한다.
- Then 둘 다 `404`를 반환한다.

## 4. 홈 추천 메뉴 (R4)

방문자는 홈에서 판매 중인 추천 메뉴를 최대 16개 본다.

S10 정상
- Given 추천 메뉴 20개(판매 중 18개, 판매 중지 1개, 숨김 1개)와 추천이 아닌 메뉴가 있다.
- When `GET /api/v1/index/menus`를 호출한다.
- Then `200`과 판매 중·추천·숨기지 않은 메뉴를 최신 등록순으로 16개 반환한다.

S11 없음
- Given 추천 메뉴가 없다.
- When 같은 요청을 보낸다.
- Then `200`과 빈 목록을 반환한다.

## API 계약

| 요구사항 | 경로 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| R1 | `GET /api/v1/menus` | `q`, `categoryId`, `status`, `sort`, `page`, `size` | `200`, 페이지 |
| R2 | `GET /api/v1/menus/categories` | 없음 | `200`, `[{id, name}]` |
| R3 | `GET /api/v1/menus/{slug}` | 없음 | `200`, 메뉴 |
| R4 | `GET /api/v1/index/menus` | 없음 | `200`, 메뉴 목록 |

- 메뉴·페이지 응답: 관리자 메뉴와 같은 `MenuResponse`·`MenuPageResponse`.
- 오류: 공통 `{code, message}`. 입력 오류 `400`, 없음·숨김 `404`.

## 범위 밖

- 홈 신청곡 요약 `GET /api/v1/index/songs`: 곡 엔티티가 생긴 뒤 곡 담당과 정한다. 그때까지 홈의 신청곡 영역은 목 데이터를 쓴다.
- 장바구니 담기 `POST /api/v1/menus/{id}/cart/items`: 장바구니 계획(`docs/my/cart/2026-10-25-backend-cart.md`).
- 관리자 메뉴 등록에서 예약 slug `categories` 거부: 관리자 메뉴 담당과 협의 (아래 가정).
- 로그인·Security 설정: 인증 담당(배기현, #61). 공개 경로 허용만 아래 가정대로 맞춘다.
- 프론트엔드 연결 (`/menus`, `/menus/[slug]`, `/`): 아래 작업 순서 6단계에서 별도 PR.

## 작업 순서

1. 계획 문서 저장 — 전체
   - 파일: `docs/menus/2026-10-25-backend-public-menus.md`
   - 커밋: `docs: 공개 메뉴 백엔드 계획 추가`
2. 목록 — S1~S4
   - 파일: `controller/MenusController.java` (`@RestController("publicMenusController")`), `service/MenusService.java` (`@Service("publicMenusService")`), `repository/MenuSpecifications.java`에 `publicSearch` 추가 (기존 `adminSearch` 동작은 바꾸지 않음)
   - 요청은 `MenuSearchRequest`를 재사용한다. 정렬은 관리자 `toSort`와 같은 값·순서.
   - 테스트: `controller/MenusControllerTest.java`, `service/MenusServiceTest.java`, `repository/MenuSpecificationsTest.java`에 공개 검색 케이스 추가
   - 확인: `cd backend && ./gradlew test --tests '*.controller.MenusController*' --tests '*.service.MenusService*'`
3. 필터용 카테고리 — S5, S6
   - 파일: `dto/menus/MenuCategoryResponse.java` (`id`, `name`), `MenusService.categories()`는 `CategoryRepository.findAllByOrderByDisplayOrderAsc()` 재사용
   - 커밋: `feat: 공개 메뉴 목록·카테고리 API 추가` (2·3단계)
4. 상세 — S7~S9
   - 파일: `MenuRepository`에 `findBySlugAndArchivedAtIsNull` (`@EntityGraph(attributePaths = "category")`) 추가
   - 커밋: `feat: 공개 메뉴 상세 API 추가`
5. 홈 추천 — S10, S11
   - 파일: `controller/HomeController.java`, `service/HomeService.java`, `MenuRepository`에 추천 조회 메서드 추가
   - 커밋: `feat: 홈 추천 메뉴 API 추가`
   - 확인: `./gradlew test` 전체 통과
6. 프론트 연결 (별도 브랜치·PR)
   - 공통 요청기는 회원 담당의 `frontend/app/_lib/api/client.ts`를 쓴다. 공개 조회라 로그인·CSRF가 필요 없다.
   - `/menus`, `/menus/[slug]`(UUID → slug), `/`의 목 호출을 API로 바꾼다. URL `page`는 1부터, API에는 `page-1`.
   - 확인: `npm run lint`, `npm run typecheck`, 관리자에서 등록한 메뉴가 방문자 화면에 보이는지 브라우저 확인

## 브랜치·커밋

- 백엔드: `feature/public-menu-api` (1~5단계), 프론트: `feature/public-menu-frontend` (6단계)
- 커밋은 단계별 하나. PR 대상은 `develop`, 머지는 사람이 한다.

## 가정

- R1: 판매 중지 메뉴는 목록·상세에 보이고 담기만 막는다. 현재 `/menus`와 `/menus/[slug]`가 판매 중지 메뉴를 `품절`로 보여 주는 동작을 따른다.
- R1: 카테고리 필터는 `categoryId`(숫자 ID)를 쓴다. 이름은 바뀔 수 있어 링크가 깨지므로 쓰지 않는다. 백엔드 청사진의 `category`와 이름만 다르다.
- R1: `size` 기본 20, 최대 100, `page`는 0부터. 현재 화면은 페이지 없이 전체를 보여 주므로 프론트는 `size=100`으로 요청하고, 메뉴가 늘면 페이지 버튼을 붙인다.
- R1·R3: 응답은 관리자와 같은 `MenuResponse`를 쓴다. 손님에게 숨길 필드가 없고, 같은 모양이라 프론트 타입을 하나로 쓸 수 있다.
- R2: 메뉴가 없는 카테고리와 `기타`도 내려준다. 현재 화면이 모든 카테고리를 필터 버튼으로 보여 준다.
- R2·R3: `categories`는 slug로 쓸 수 없는 예약어다(백엔드 청사진). 지금 관리자 메뉴 등록은 이를 막지 않으므로, slug가 `categories`인 메뉴는 상세가 열리지 않는다. 관리자 메뉴 담당에게 등록 시 거부를 요청한다.
- R3: slug 형식이 맞지 않아도 `400`이 아니라 `404`. 경로 자원이 없는 것으로 본다.
- R4: 개수 16은 현재 홈 화면(`frontend/app/(public)/page.tsx`) 기준이다.
- 인증: 공개 API라 로그인을 요구하지 않는다. 인증 PR #61의 `SecurityConfig`는 허용 목록에 없는 경로를 모두 `authenticated()`로 막는다. 인증 청사진 5단계도 공개 조회 경로를 메서드까지 명시해 허용하기로 했다. 그래서 `GET /api/v1/menus`, `/api/v1/menus/categories`, `/api/v1/menus/{slug}`, `/api/v1/index/menus`를 인증 담당에게 공개 경로로 전달한다. 이 PR이 #61보다 늦게 머지되면 직접 `SecurityConfig`에 `GET` 허용을 추가하고 인증 담당에게 리뷰를 받는다.

## 참고

- 2026-10-25 확인: `MenuRepository`는 `JpaSpecificationExecutor<Menu>`와 `findAll(Specification, Pageable)`에 `category` EntityGraph가 있다. `MenuSpecifications.adminSearch`는 숨긴 메뉴를 항상 제외한다.
- 2026-10-25 확인: `CategoryRepository.findAllByOrderByDisplayOrderAsc()`가 이미 있다. 관리자 `CategoriesService.list()`는 메뉴 수 집계를 함께 하므로 공개 API에서 쓰지 않는다.
- 2026-10-25 확인: `backend/docs/2026-10-20-backend-blueprint.md`의 공개 `MenusController`·`HomeController` 경로와 Bean 이름 규칙.
- 2026-10-25 확인: `frontend/app/(public)/menus/page.tsx`의 정렬 4종(`newest`, `name`, `price-low`, `price-high`)과 검색.
