# 관리자 주문 프론트 연결 계획

## 목표와 현재 상태

- 목표: `/admin/orders`·`/admin/orders/[id]`가 실제 관리자 주문 API를 사용하고, 검색·세 영역의 페이지 이동·상세·상태 변경·접수 취소를 실제 관리자 세션으로 수행한다.
- 현재: **계획 작성 단계이며 프론트 구현은 미착수**다. 목록 226줄과 상세 페이지에 조회·가공·표시가 섞여 있고, 두 페이지와 `_actions.ts`가 목 주문 저장소를 호출한다.
- 기준 코드: 2026-10-26 현재 관리자 화면·API를 `d8fb068`에서 확인하고, 이미 머지된 작업의 중복을 피하려고 문서 커밋만 `origin/develop`의 `5eeab69` 기준 위에 정리했다. 작업 브랜치는 계속 `feature/admin-orders`다. 인증 #61·고객 주문 #69 등 팀 코드가 포함되며, 이전 백엔드 문서의 "인증 미구현" 등은 작성 당시 상태와 구분한다.
- 작업 브랜치: **`feature/admin-orders`만 사용**한다. 로컬 `develop`의 시작 커밋은 `62c139a7b6326caff606861b218bb1c846f943fa`이며 이 작업에서 변경하지 않는다. 다른 팀원 브랜치 수정·PR 머지도 하지 않는다.
- 선행: 실제 백엔드·`API_ORIGIN`·테스트 관리자 세션과 주문 fixture. 고객 주문 화면 연결이나 회원 FK 완료를 관리자 화면 개발의 필수 선행으로 두지는 않는다. 전체 고객 흐름 검증은 별도 통합 단계다.

기준 문서: [프론트 규칙](../../FRONTEND.md) 2·5·8·9장, [DB 설계](../../database-design.md), [백엔드 계획·API 계약](2026-10-26-backend-order-management.md), [팀 연동 검토](2026-10-26-integration-review.md), [인증 6단계](../../../backend/docs/2026-10-25-auth-step6.md), [용어](../../../GLOSSARY.md). 분리 방식은 기존 화면과 [공개 메뉴 연결 계획](../../menus/2026-10-25-frontend-public-menus.md)을 참고한다. 기술 동작은 설치된 Next.js 16.3.5 문서의 Server/Client Components·Forms·cookies·revalidatePath·error를 확인했다.

## 1. 범위와 API 계약

| 페이지 | 주 컨트롤러 | 사용할 API |
| --- | --- | --- |
| `/admin/orders` | `admin/OrdersController` | `GET /api/v1/admin/orders` |
| `/admin/orders/[id]` | 같은 컨트롤러 | `GET /api/v1/admin/orders/{id}` |
| 두 페이지의 변경 동작 | 같은 컨트롤러 | `PUT /api/v1/admin/orders/status` |

목록 쿼리: `q`, `status`, `group=active|completed|canceled`, `sort=newest|oldest`, `page`(0부터), `size`(1~100). 페이지 응답은 `{items,page,size,totalElements,totalPages}`다. 별도의 `/summary`·`/{id}/cancel` API를 가정하거나 추가하지 않는다.

```json
{"id":1,"expectedStatus":"received","statusVersion":0,"nextStatus":"preparing"}
```

- 상태: `received ↔ preparing ↔ ready ↔ completed`, 취소는 `received → canceled`만. 취소 사유 입력·전송·표시를 제거한다. 확인 대화상자는 취소 대상과 되돌릴 수 없음을 확인하는 용도로 유지한다.
- 다음 상태 선택지는 서버의 `allowedStatuses`를 사용한다. 목 함수 `allowedAdminOrderStatuses`로 다시 계산하지 않는다. 프론트에서 선택지를 조작해도 최종 권한·상태·버전 검사는 백엔드가 한다.
- 관리자 지역 타입은 `AdminOrderResponse`·`AdminOrderPageResponse`와 맞춘다. 주문·회원·품목·메뉴 ID는 숫자, `temperature`는 `hot|iced|null`, `request`는 `string|null`이다. `statusVersion`, 품목 `id`, 스냅샷 필드를 유지한다.
- `_lib/api.ts`에서 `unknown` 응답의 객체·배열·enum·필수/nullable 필드·ISO 시각·안전한 정수를 검증한다. 알 수 없는 상태를 정상 상태로 바꾸거나 API 실패를 빈 목록으로 숨기지 않는다.
- 문자열 UUID의 앞 8자를 자르던 주문번호는 숫자 ID 전체를 표시한다. 품목 React key는 `item.id`로 바꾼다. 금액은 원, 시각 표시는 `Asia/Seoul`, 결제 문구는 **카운터 결제수단**을 쓴다.

## 2. 컴포넌트와 파일 분리

`page.tsx`는 권한·파라미터 확인 후 조회 결과와 컴포넌트를 조립한다. 각 페이지의 `h1`은 page에 남긴다. 폴더 구조와 CSS·기존 다방 디자인을 유지하며 책임이 있는 단위만 분리한다.

```text
frontend/app/admin/orders/
├─ page.tsx                         목록 조립·h1·metadata
├─ _actions.ts                     목록/상세 변경 액션
├─ loading.tsx                     목록·하위 경로의 로딩
├─ error.tsx                       예상 밖 조회 오류·재시도
├─ _lib/
│  ├─ types.ts                     관리자 응답·상태·섹션 타입과 검증
│  ├─ api.ts                       조회·변경 API 경계
│  ├─ queries.ts                   세 섹션·요약 조회 조합
│  ├─ searchParams.ts              URL 파싱·링크·안전한 복귀 주소
│  └─ format.ts                    숫자 주문번호·원화·온도·한국 시각
├─ _components/
│  ├─ OrderSummary.tsx             전체/처리 중/완료/취소 요약
│  ├─ OrderFilters.tsx             검색·상태·정렬 GET 폼
│  ├─ OrderSection.tsx             섹션 결과·빈 상태·보기·페이지 조립
│  ├─ OrderList.tsx                목록 표
│  ├─ OrderReceipt.tsx             그리드의 주문 명세표
│  ├─ OrderPagination.tsx          섹션별 이전/다음 Link
│  ├─ OrderStatusControl.tsx       서버에서 선택지·액션 바인딩
│  ├─ OrderFeedback.tsx            허용된 결과 코드 안내
│  ├─ OrderSectionAccordion.tsx    기존 접기/펼치기 유지 (client)
│  ├─ StatusChangeForm.tsx         상태 선택·검증·pending (client)
│  └─ ConfirmCancelDialog.tsx      사유 없는 취소 확인 (client)
└─ [id]/
   ├─ page.tsx                     상세 조립·h1·metadata
   └─ _components/
      ├─ OrderItems.tsx            당시 품목·수량·단가·합계
      └─ OrderMeta.tsx             고객·수령 방식·요청사항·수정 시각
```

- 서버 컴포넌트가 기본이다. client는 접기/펼치기·상태 폼·대화상자·오류 경계에만 둔다. 서버가 만든 표/명세표는 Accordion의 `children`으로 전달한다.
- 목록/상세가 함께 쓰는 코드는 `orders/` 안에 둔다. 다른 라우트의 `_components`·`_lib`를 import하지 않는다. CSS는 현재 CSS Modules를 우선 재사용한다.
- 현재 `StatusChangeForm.tsx`의 선택·확인·pending 책임을 나누되, 버튼 하나마다 파일을 만들거나 범용 테이블·폼 프레임워크를 추가하지 않는다. named export·지역 `Props` 타입을 적용한다.
- 고객 목 주문과 연결된 `app/_lib/orders/types.ts`, `mock/orders.ts`는 전역 교체·삭제하지 않는다. 관리자 화면은 지역 API 타입으로 전환한다.

## 3. 세션·CSRF와 공통 요청기

현재 `api/client.ts`는 쿠키를 넘기는 GET 요청기지만 CSRF·응답 Set-Cookie 전달 기능은 없다. `BackendSession`은 해당 기능을 갖췄지만 `send`·`csrf`가 private이고 업무 PUT 메서드는 없다. **기존 `apiFetch`에 PUT만 추가하는 방식으로 연결하지 않는다.**

1. 인증 담당과 공유할 최소 변경으로 `BackendSession`에 업무용 `requestJson` 진입점을 추가하는 방향을 사용한다. 기존 private 전송·CSRF·쿠키 jar를 재사용하며 인증 메서드의 계약은 유지한다.
2. 조회는 현재 요청의 JSESSIONID로 생성한 읽기용 세션을 `_lib/api.ts`에서 사용한다. no-store를 유지하고 Server Component에서는 쿠키를 쓰지 않는다. 조회 중 만료된 쿠키는 기존 Proxy·다음 액션의 전송 규칙을 따른다.
3. 변경은 `createAuthSession()`으로 액션마다 새 세션을 만들고 CSRF 취득 → 쿠키 jar 갱신 → PUT → 모든 Set-Cookie 전달 순서를 지킨다. 응답 오류에서도 만료 쿠키를 반영한다.
4. 새 업무 경계는 `backend-session.ts`의 오류 타입을 일관되게 사용한다. 같은 이름이지만 형태가 다른 `client.ts`의 `ApiRequestError(status,error)`와 `backend-session.ts`의 `(status,code,message)`를 혼용하지 않는다.
5. CSRF·세션 토큰을 URL·localStorage·화면 props에 노출하지 않는다. 변경 요청을 자동 재시도하지 않는다. 인증 전송 변경 시 기존 로그인·가입·로그아웃·Proxy 회귀 테스트를 함께 실행하고 A 담당자 리뷰 대상으로 적는다.

`BackendSession`은 Proxy에서도 사용하므로 여기에 `next/headers`나 Server Action 전용 의존성을 넣지 않는다. 쿠키 읽기/쓰기는 SSR 어댑터·기존 `createAuthSession`·Proxy 콜백에 남기고, 사용자 간 세션 객체를 공유하지 않는다.

구현 대상은 공통 전송의 최소 확장뿐이다. 로그인 정책·SecurityConfig·고객 주문의 `CurrentUserContext`를 이번 프론트 작업에서 새로 구현하지 않는다.

## 4. 목록 조회·URL·페이지

- 유지할 URL: `q`, `status`, `sort`, `view=list|grid`, `activePage`, `completedPage`, `canceledPage`. `group`은 UI 섹션에서 결정하는 API 전용 값이다.
- 기존대로 `q`는 trim 후 100자로 제한한다. 알려지지 않은 상태·정렬·보기는 기본값, 중복/잘못된 페이지는 1로 정규화한다. 페이지는 API Integer 범위 안의 정수로 제한하고 API에 `page-1`, `size=10`을 보낸다.
- 검색·상태·정렬은 GET 폼 제출로 함께 적용하고 세 페이지를 초기화한다. 보기 전환은 Link로 검색·세 페이지를 유지한다. URL 값을 client state에 복제하지 않는다.
- 상태 전체일 때 `active`, `completed`, `canceled`를 각각 요청해 독립 페이지로 표시한다. 특정 상태면 해당 섹션만 요청한다. 전체 데이터를 받은 뒤 `.filter()`·`.slice()`로 페이지를 만들지 않는다.
- 조회 결과 총건수·섹션 건수는 각 응답의 `totalElements`다. 헤더 요약은 검색어·상태 조건을 제외한 세 group의 건수를 사용하며 전체는 세 건수의 합이다. 콘텐츠 조회로 같은 건수를 이미 얻었으면 재사용하고, 필요한 추가 건수 조회만 `size=1`로 수행한다.
- 서로 독립인 읽기 요청은 병렬 실행한다. 별도 집계 API나 영속 캐시를 추가하지 않는다. 어떤 요청이 실패해도 그 영역을 주문 0건으로 표시하지 않는다.
- 필터 변경·취소·되돌리기로 마지막 페이지가 비면 마지막 유효 페이지를 한 번 다시 조회한다. 주문이 0개면 UI page 1, 빈 상태를 표시한다. 목록↔상세↔목록에 정규화된 필터·보기·세 페이지를 유지한다.
- `updated`, `error`, `focus`는 허용한 결과 값만 사용한다. 임의 return URL을 받지 않고 서버에서 내부 복귀 주소를 만든다. 완료·취소 성공 시 해당 섹션이 열리도록 기존 focus 흐름을 유지한다.

## 5. 상세·상태 변경·오류

- 상세 ID는 양의 안전한 정수인지 먼저 검사한다. 잘못된 ID와 상세 GET 404는 `notFound()`로 처리한다. 실제 주문의 당시 품목·가격·이미지·온도를 표시하고 현재 메뉴 데이터를 다시 조회하지 않는다.
- 각 액션 첫 단계는 `requireRole("admin", 요청한 내부 경로)`다. `id`, `expectedStatus`, `statusVersion`(0 이상 Integer), `nextStatus`와 폼 입력은 bind 값도 포함해 서버에서 검증한다.
- 폼은 `useActionState`/pending으로 중복 제출을 막고 실패한 선택값과 필드 오류를 보존한다. 선택지의 최종 허용 여부는 백엔드가 검사한다. 성공 전 상태·버전을 낙관적으로 바꾸지 않는다.
- 취소 확인은 주문번호·되돌릴 수 없음·확인/닫기만 제공한다. 접수에서만 서버 선택지에 나오며 취소 사유 필드와 기존 오류 문구·상세 취소 사유 영역을 제거한다.
- 성공 시 `/admin/orders`, 해당 관리자 상세, `/my/orders`, 해당 고객 상세, `/admin`을 `revalidatePath`로 갱신하고 내부 URL로 redirect한다. redirect/notFound는 API try/catch 밖에 둔다.

| 상황 | 처리 |
| --- | --- |
| 프론트 검증·API 400 | 상태 폼에 오류와 선택값 유지, 해당 입력으로 포커스 |
| 인증 401 | 원래 내부 경로를 next로 넣어 로그인 이동 |
| 권한 403 | `/forbidden` 이동. `CSRF_INVALID`는 권한 오류와 구분해 재조회/재시도 안내 |
| 변경 404 | 목록으로 복귀해 주문 없음 안내 |
| `STALE_STATUS` 409 | 관련 관리자 경로 갱신 후 새 상태·버전으로 재조회, 자동 재제출 금지 |
| `INVALID_STATUS` 409 | 상태가 바뀌었거나 허용되지 않음을 안내하고 서버 선택지 갱신 |
| 연결 실패·5xx·응답 형식 오류 | 빈 데이터로 숨기지 않고 재시도 가능한 오류 안내. 예기치 않은 조회 오류는 route error 경계 |

로딩·재시도 UI와 두 페이지의 title/noindex를 추가한다. 설치된 Next error 문서의 `retry` 계약을 확인해 사용한다. 상태 선택에 보이는 label과 `aria-describedby` 오류 연결, `role=status/alert` 안내를 두고 대화상자 Esc·초기 포커스·닫힌 뒤 트리거 포커스 복귀를 확인한다. `main`은 기존 관리자 layout의 하나를 사용한다.

## 6. 단계별 작업과 커밋

| 순서 | 구현 단위 | 완료 기준·커밋 예시 |
| --- | --- | --- |
| 0 | 계획·현재 계약 확인 | 이 문서만 작성. `docs: 관리자 주문 프론트 연결 계획 추가` |
| 1 | 세션 전송 최소 확장·지역 타입/API/URL·표시 유틸 | 업무 GET/PUT의 쿠키·CSRF·오류 검증, 인증 회귀 통과. `feat: 관리자 주문 API 요청 경계 추가` |
| 2 | 목록 컴포넌트 분리·DB 페이지 조회 | 검색·세 영역·요약·리스트/그리드·복귀 조건 유지. `feat: 관리자 주문 목록 API 연결 추가` |
| 3 | 상세·변경 폼·취소·충돌 안내 | 서버 상태·버전 사용, 사유 제거, 관리자/고객 경로 재검증. `feat: 관리자 주문 상세와 상태 변경 연동 추가` |
| 4 | 접근성·로딩/오류·metadata·문서 | 아래 시나리오 확인 후 FRONTEND 8장 갭·계약 문서·PR 갱신. `fix: 관리자 주문 연동 접근성과 오류 처리 수정` |

현재는 **0단계만 수행**한다. 백엔드 PR #80은 이미 머지되었으므로, 이번 계획은 같은 `feature/admin-orders`에서 문서 PR로 제안한다. 이미 squash 머지된 백엔드 커밋을 중복 제안하지 않도록 문서 커밋만 최신 기준 위에 놓고, 로컬 `develop`은 변경하지 않는다. 후속 구현 때 각 단계가 타입 검사·검증을 통과하는 단위로 커밋한다. `develop` 직접 커밋/푸시·머지·다른 사람 브랜치 수정은 하지 않는다. rebase 충돌 시 abort 후 보고한다.

## 7. 검증 시나리오와 완료 조건

| 번호 | 검증할 결과 |
| --- | --- |
| F1 | 실제 관리자 로그인으로 DB 주문 목록·상세 표시. 새로고침 후 유지. 관리자 경로에서 목 주문 저장소 호출 없음 |
| F2 | 주문번호·고객명·메뉴명 검색, 상태·정렬 조합, 결과 없음과 초기화 동작 |
| F3 | 섹션마다 10건 초과 fixture로 독립 페이지·필터 초기화·보기 전환·상세 복귀·범위 밖 페이지 확인 |
| F4 | 검색 후에도 상단 요약은 전체 기준, 결과 건수는 검색 기준. 처리 중에는 `ready`도 포함 |
| F5 | 숫자 ID·`iced`·nullable 요청사항·스냅샷·품목 key·원화/한국 시각 표시. 잘못된 ID·404 상세 처리 |
| F6 | 인접 단계 이동·되돌리기 후 새 버전 반영. 건너뛰기·준비 중 취소는 거부되고 UI에도 선택지 없음 |
| F7 | 접수 취소 확인/닫기, 사유 없이 취소, 취소 후 선택지 없음. 마지막 행 이동 시 페이지·focus 보정 |
| F8 | 두 관리자/탭에서 같은 주문 변경: 먼저 한 건만 성공, 두 번째는 409 안내와 최신 상태·버전 표시 |
| F9 | 미인증·고객·만료 세션·역할/정지 변경·CSRF 누락/무효·서버 중단에서 적절한 안내. DB 오변경 없음 |
| F10 | 기존 가입·로그인·로그아웃과 다중 Set-Cookie·쿠키 만료 회귀 없음. 토큰·임의 역할 우회 없음 |
| F11 | 모바일/데스크톱 표·그리드, Tab/Enter/Esc, 포커스·label·동적 안내·axe serious/critical 확인 |
| F12 | 기존 인증 E2E와 주문 E2E, lint·typecheck·build 통과. 결과를 실제 실행/미실행으로 구분해 기록 |

- 순수 파서·안전한 복귀 주소·응답 검증, CSRF 전송·실패 쿠키 처리를 대상으로 필요한 검증만 추가한다. 기존 구현을 그대로 반복하는 테스트나 모든 표시 컴포넌트의 스냅샷 테스트는 만들지 않는다.
- `frontend/e2e/admin-orders.spec.ts`를 기존 Playwright 설정에 추가한다. 관리자 로그인·쓰기·충돌은 실제 백엔드와 격리 테스트 PostgreSQL을 사용하고, 네트워크/잘못된 응답만 필요한 범위에서 테스트용 중계·fixture로 만든다. 운영용 seed·인증 우회 API는 만들지 않는다.
- fixture는 테스트 DB에 관리자·고객·세 그룹의 주문을 준비한다. 기존 개발 `.env`·DB·계정을 수정하거나 초기화하지 않는다. E2E 실행 조건은 기존 [안내](../../../frontend/e2e/README.md)를 따른다.
- 실행: `cd frontend && npm run lint`, `npm run typecheck`, `npm run build`, 테스트 서버를 준비한 뒤 `npm run test:e2e -- e2e/admin-orders.spec.ts e2e/session-auth.spec.ts`. 전송/백엔드를 수정하면 관련 백엔드 테스트도 실행한다. Lighthouse·키보드·axe 결과를 PR에 기록한다.

## 8. 팀 연동과 범위 밖

- **A:** 세션 전송 확장·기존 인증 회귀를 리뷰한다. 실제 세션 규칙을 재사용하며 임시 관리자 헤더·목 인증으로 화면만 통과시키지 않는다.
- **D:** Order 생성·멱등성·고객 API 계약을 변경하지 않는다. 현재 SecurityConfig는 고객 `/api/v1/orders`를 명시적으로 허용하지 않고 기본 CurrentUserContext도 미인증이다. 고객 주문 생성 HTTP와 고객 화면의 실제 연동 완료 전에는 "고객 화면까지 반영 검증 완료"로 표시하지 않는다.
- **회원/FK:** 현재 공유 Order의 scalar `customer_id`와 회원 FK 통합은 별도 팀 작업이다. 관리자 화면 연결을 이유로 회원 도메인을 수정하지 않는다.
- **관리자 홈:** `/admin/page.tsx`는 메뉴·곡·주문 모두 목 저장소를 사용한다. 이번 두 페이지 전환만으로 홈 주문 수치가 실제 값으로 바뀌지 않는다. 홈 집계 API 연결은 별도 쌍으로 남기고, 갱신 경로 호출만으로 해결됐다고 표시하지 않는다.
- **고객 화면:** `/checkout`·`/my/orders*`와 고객 취소 UI 제거는 D 담당 범위다. 관리자 화면의 목 의존만 제거하고 공유 목 파일은 다른 사용처가 없어질 때까지 유지한다.
- **공통 갭:** 전역 skip link·root metadata·다른 라우트 main/SEO·전체 디자인 재구성·신규 상태 관리 라이브러리는 이번 범위 밖이다. 담당 쌍의 실제 처리 항목과 남긴 8장 갭을 PR에 적는다.

완료는 관리자 두 페이지가 실제 API로 동작하고 F1~F12 검증 결과를 기록한 시점이다. 계획 작성·타입 검사 통과·API 호출 코드 추가만으로 구현 완료로 표시하지 않는다.
