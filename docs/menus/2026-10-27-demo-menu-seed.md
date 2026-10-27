# 발표 시연용 메뉴·카테고리 시드

## 한눈에
- 끝나면: `seed` 프로필로 백엔드를 한 번 띄우면 공용 DB에 카테고리 6개와 메뉴 36개(사진 포함)가 채워지고, `/menus`와 `/`에서 바로 시연할 수 있다. 이미 있던 slug는 건드리지 않는다.
- 결정 필요: 없음
- 규모: 4단계, 약 2시간

## 1. 시드 프로필에서만 실행 (R1)
시더는 `seed` 프로필이 켜졌을 때만 실행되고, 평소 실행과 `prod`에서는 아무것도 하지 않는다.

S1 정상
- Given 빈 DB
- When `seed` 프로필로 앱을 시작한다
- Then 시드가 실행되고 로그에 `메뉴 시드: 추가 36, 건너뜀 0`이 찍힌다

S2 프로필 없음
- Given 빈 DB
- When 프로필 없이 앱을 시작한다
- Then `menus` 테이블이 0행이다. 카테고리는 기존 `CategoryInitializer`가 만든 `기타` 1개뿐이다

## 2. 카테고리 (R2)
목업 순서대로 `커피, 차, 쥬스, 다과, 세트`를 만들고, `기타`는 항상 마지막에 둔다.

S3 정상
- Given 빈 DB
- When `seed` 프로필로 시작한다
- Then `GET /api/v1/menus/categories`가 `커피, 차, 쥬스, 다과, 세트, 기타` 순서로 6개를 돌려준다

S4 일부가 이미 있음
- Given `커피`, `차`, `기타`가 이미 있다
- When `seed` 프로필로 시작한다
- Then `쥬스, 다과, 세트`만 추가된다. 기존 `커피`·`차`의 id는 그대로이고 `기타`는 마지막이다

## 3. 메뉴 36개 (R3)
`frontend/app/_lib/mock/menus.ts`의 `seedMenus` 36개를 아래 규칙으로 옮긴다.
- `slug` = 목업 `image` 값
- `imageUrl` = `/images/menus/{image}.jpg`
- 카테고리 = 목업 `categories[0]`과 같은 이름의 카테고리
- `temperatures` → `supportsHot`(`hot` 포함) / `supportsIced`(`ice` 포함)
- `available`(없으면 true), `isNew`, `recommended`는 그대로 쓴다

S5 정상
- Given 빈 DB
- When `seed` 프로필로 시작한다
- Then `GET /api/v1/menus/coffee`가 이름 `커피`, 가격 3500, 카테고리 `커피`, 이미지 `/images/menus/coffee.jpg`, 핫·아이스 모두 지원, 추천을 돌려준다

S6 판매 중지·온도 없음
- Then `fresh-arrowroot-juice`는 판매 중지(`available=false`)다
- Then `monaka`는 `supportsHot=false`, `supportsIced=false`다

S7 이미지 파일 일치
- Then 36개 메뉴의 `imageUrl`이 가리키는 파일이 모두 `frontend/public/images/menus/`에 있다

## 4. 이미 있는 데이터는 건너뜀 (R4)
같은 slug의 메뉴가 이미 있으면 덮어쓰지 않고 건너뛴다. 이 메뉴들은 사람이 관리자 화면에서 아래 경로표를 보고 직접 고친다.

S8 기존 slug
- Given `coffee` 메뉴가 가격 4000으로 이미 있다
- When `seed` 프로필로 시작한다
- Then `coffee`의 가격은 4000 그대로다
- Then 나머지 35개가 추가된다
- Then 로그에 `메뉴 시드: 추가 35, 건너뜀 1 [coffee]`가 찍힌다

S9 보관된 기존 slug
- Given `coffee`가 삭제(보관, `archivedAt` 있음) 상태로 있다
- Then `coffee`는 건너뛴다. slug 유일 제약 때문에 다시 만들 수 없다

S10 두 번 실행
- Given S1을 한 번 실행한 DB
- When `seed` 프로필로 다시 시작한다
- Then 메뉴는 36개, 카테고리는 6개 그대로다. 로그는 `추가 0, 건너뜀 36`이다

## 5. 시연 화면 순서 (R5)
공개 목록 기본 정렬(`createdAt desc, id desc`)에서 목업처럼 첫 개시 메뉴 6개가 맨 앞에 오고, 그 뒤로 목업 배열 순서(커피 → … → 든든 보양 세트 중 첫 개시가 아닌 것)가 이어진다.

S11 정상
- Given 빈 DB에 시드를 실행했다
- When `GET /api/v1/menus?size=100`
- Then 앞 6개가 첫 개시 메뉴(`perilla-seed-tea, yam-tea, persimmon-vinegar, strawberry-juice, set-jujube, set-boyang`)다
- Then 7번째가 `coffee`, 8번째가 `green-tea`다

## 6. 기존 메뉴 수정용 이미지 경로표 (R6)
건너뛴 메뉴를 직접 고칠 수 있게 slug와 이미지 경로표를 이 문서에 둔다. 경로는 모두 `/images/menus/<slug>.jpg`다.

| 카테고리 | 메뉴 → slug |
| --- | --- |
| 커피 | 커피 `coffee` |
| 차 | 녹차 `green-tea` · 홍차 `black-tea` · 칡차 `arrowroot-tea` · 율무차 `jobs-tears-tea` · 산수유 `sansuyu` · 둥굴레차 `solomons-seal-tea` · 유자차 `yuja-tea` · 생강차 `ginger-tea` · 들깨차 `perilla-seed-tea` · 인삼차 `ginseng-tea` · 칡즙 `arrowroot-juice` · 생칡즙 `fresh-arrowroot-juice` · 쌍화차 `ssanghwacha` · 벌꿀차 `honey-tea` · 대추차 `jujube-tea` · 마차 `yam-tea` · 쑥차 `mugwort-tea` · 은행차 `ginkgo-tea` · 코코아 `cocoa` |
| 쥬스 | 우유 `milk` · 감식초 `persimmon-vinegar` · 오렌지 쥬스 `orange-juice` · 매실 쥬스 `maesil-juice` · 토마토 쥬스 `tomato-juice` · 딸기 쥬스 `strawberry-juice` |
| 다과 | 모나카 `monaka` · 카스테라 `castella` · 계란 후라이 `fried-egg` · 깨죽 `sesame-porridge` |
| 세트 | 모닝커피 세트 `set-morning` · 쌍화차 세트 `set-ssanghwa` · 대추차 세트 `set-jujube` · 유자차 세트 `set-yuja` · 딸기 쥬스 세트 `set-strawberry` · 든든 보양 세트 `set-boyang` |

예: 생칡즙 → `/images/menus/fresh-arrowroot-juice.jpg`

## 범위 밖
- 계정(관리자·손님), 신청곡·사연, 주문, 장바구니 시드. 시연 중 화면으로 만든다
- 목업의 `nameEn`. 백엔드에 컬럼이 없다
- 이미 있는 메뉴의 값 갱신. 사람이 직접 고친다 (R4)
- 공용 DB에서 시드를 실행하는 일. 머지 후 사람이 한다 (아래 실행 절차)

## 작업 순서
1. 가장 얇은 경로: 프로필 시더와 카테고리 — S1, S2, S3
   - 파일: `backend/src/main/java/com/newcafe/backend/config/DemoMenuSeeder.java`, `backend/src/test/java/com/newcafe/backend/config/DemoMenuSeederTest.java`(단위: S7·S11 넣는 순서), `backend/src/test/java/com/newcafe/backend/DemoMenuSeederIntegrationTest.java`(`@Tag("integration")`, Testcontainers) (고침 10-27: 컨테이너가 필요한 시나리오는 기존 규칙대로 통합 테스트로 분리)
   - `@Profile("seed")` `ApplicationRunner`로 만든다. 먼저 `CategoriesService.initializeFallback()`을 호출하고(멱등이라 `CategoryInitializer`와 순서를 맞출 필요가 없다), `existsByName`이 false인 이름만 `CategoriesService.create(new CategoryRequest(name))`로 만든다
   - 확인: `./gradlew test --tests '*DemoMenuSeederTest'`, `./gradlew integrationTest --tests '*DemoMenuSeederIntegrationTest'`
2. 메뉴 36개 옮기기 — S5, S6, S7, S11
   - 시더 안에 목업 값을 `record` 목록으로 옮기고 `adminMenusService.create(new MenuCreateRequest(...))`로 넣는다. 검증은 기존 서비스·엔티티 규칙을 그대로 탄다
   - 넣는 순서: 첫 개시가 아닌 메뉴를 배열 역순으로 먼저, 첫 개시 메뉴를 배열 역순으로 마지막에 넣는다
   - S7은 테스트에서 `../frontend/public/images/menus/<slug>.jpg` 존재를 확인한다
   - 확인: 같은 명령
3. 건너뛰기와 로그 — S4, S8, S9, S10
   - `menuRepository.existsBySlug`가 true면 건너뛰고(보관 포함), 끝에 추가·건너뜀 개수와 건너뛴 slug를 `log.info`로 남긴다
   - 확인: 같은 명령, 그리고 `./gradlew test integrationTest` 전체
4. PR — 이 문서 링크와 실행 절차를 본문에 적는다
   - 확인: `gh pr view`

## 공용 DB 실행 절차 (머지 후, 사람이)
1. `backend/.env`의 `DB_URL`이 팀 공용 DB(원격)를 가리키는지 확인한다 (고침 10-27: 공용 DB는 WSL의 `ncafe-db`가 아니라 `.env`의 원격 DB)
2. 백업한다: `pg_dump -t categories -t menus`
3. `SPRING_PROFILES_ACTIVE=seed ./gradlew bootRun`을 실행하고, 시드 로그를 확인한 뒤 종료한다
4. `/menus`와 `/`를 확인하고, 로그에 나온 건너뛴 slug는 관리자 화면에서 위 경로표대로 고친다

## 브랜치·커밋
- 브랜치: `feature/demo-menu-seed` (`origin/develop`에서 분기)
- 커밋: `docs: 시연용 메뉴 시드 계획 추가` — 이 문서
- 커밋: `feat: 발표 시연용 메뉴 시드 추가` — 단계 1~3

## 가정
- 시드는 API가 아니라 서버 안 `ApplicationRunner`로 넣는다. 기존 `CategoryInitializer`·`MusicBoxStateInitializer`와 같은 방식이고, 서버 검증을 그대로 탄다
- 메뉴 문구·가격은 목업 값을 그대로 쓰고 새로 짓지 않는다
- 판정 기준은 slug(메뉴)와 이름(카테고리)이다. 이름이 같아도 slug가 다르면 새 메뉴로 넣는다
- 시드 메뉴의 `createdAt`은 실행 시각이다. 순서는 넣는 순서로만 맞춘다

## 참고 (10-27 확인)
- 목업: `frontend/app/_lib/mock/categories.ts`(`커피, 차, 쥬스, 다과, 세트, 기타`), `frontend/app/_lib/mock/menus.ts`(`seedMenus` 36개, 첫 개시 6개, 추천 7개)
- 이미지: `frontend/public/images/menus/`의 jpg 36장이 목업 `image` 값과 1:1로 맞는다
- `Menu`(`backend/.../entity/menu/Menu.java`): 카테고리 1개, slug 유일·수정 불가, `imageUrl`은 `/images/menus/...` 경로를 허용한다. 삭제는 `archive()`(보관)다
- `CategoriesService.create`는 `기타`를 항상 마지막에 둔다. `initializeFallback()`은 멱등이다
- DB: PostgreSQL, `ddl-auto: update`, 마이그레이션 도구 없음. 테스트는 Testcontainers(`BackendDatabaseIntegrationTest`)
- 공용 DB에는 10-25 기준으로 `커피`·`생칡즙`이 있었다 (`docs/menus/2026-10-25-frontend-public-menus.md`)
