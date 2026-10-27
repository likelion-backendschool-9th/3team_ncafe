# 관리자 주문 프론트 연결 계획

## 목표와 현재 상태

- 목표: `/admin/orders`·`/admin/orders/[id]`가 실제 관리자 주문 API를 사용하고, 검색·세 영역의 페이지 이동·상세·상태 변경·접수 취소를 실제 관리자 세션으로 수행한다.
- 현재: **목록·상세·상태 변경의 실제 API 연결을 구현했다.** page는 서버 조회 결과를 조립하며, 관리자 주문 경로의 목 주문 저장소 의존을 제거했다. 실제 실행 결과와 남은 통합 범위는 10장에 기록한다.
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

착수 당시 `api/client.ts`에는 CSRF·응답 Set-Cookie 전달 기능이 없고, `BackendSession`의 `send`·`csrf`는 private이었다. 구현에서는 기존 메서드를 유지하며 업무용 `requestJson`을 추가했다. **기존 `apiFetch`에 PUT만 추가하는 방식으로 연결하지 않는다.**

1. 인증 담당과 공유할 최소 변경으로 `BackendSession`에 업무용 `requestJson` 진입점을 추가하는 방향을 사용한다. 기존 private 전송·CSRF·쿠키 jar를 재사용하며 인증 메서드의 계약은 유지한다.
2. 조회는 현재 요청의 JSESSIONID로 생성한 읽기용 세션을 `_lib/api.ts`에서 사용한다. no-store를 유지하고 Server Component에서는 쿠키를 쓰지 않는다. 조회 중 만료된 쿠키는 기존 Proxy·다음 액션의 전송 규칙을 따른다.
3. 변경은 `createAuthSession()`으로 액션마다 새 세션을 만들고 CSRF 취득 → 쿠키 jar 갱신 → PUT → 모든 Set-Cookie 전달 순서를 지킨다. 응답 오류에서도 만료 쿠키를 반영한다.
4. 새 업무 경계는 `backend-session.ts`의 오류 타입을 일관되게 사용한다. 같은 이름이지만 형태가 다른 `client.ts`의 `ApiRequestError(status,error)`와 `backend-session.ts`의 `(status,code,message)`를 혼용하지 않는다.
5. CSRF·세션 토큰을 URL·localStorage·화면 props에 노출하지 않는다. 변경 요청을 자동 재시도하지 않는다. 인증 전송 변경 시 기존 로그인·가입·로그아웃·Proxy 회귀 테스트를 함께 실행하고 A 담당자 리뷰 대상으로 적는다.

`BackendSession`은 Proxy에서도 사용하므로 여기에 `next/headers`나 Server Action 전용 의존성을 넣지 않는다. 쿠키 읽기/쓰기는 SSR 어댑터·기존 `createAuthSession`·Proxy 콜백에 남기고, 사용자 간 세션 객체를 공유하지 않는다.

회원 관리의 최신 `csrfHeaders()`도 확인했다. 이 함수는 `admin/users/_lib/api.ts`의 지역 코드이므로 다른 라우트에서 직접 가져오지 않는다. 주문은 기존 쿠키 교체·만료 전달까지 유지해야 하므로 공통 세션 전송을 최소 확장한다. 기존 `client.ts`의 export·오류 생성자·호출 동작은 변경하지 않아 회원·공개 메뉴 소비자를 그대로 유지한다. 구현 착수 직전 같은 공통 확장이 먼저 들어왔는지 재확인하고, 이미 있으면 재사용한다.

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
- 페이지는 `requireRole("admin", 요청한 내부 경로)`를 사용한다. 각 액션 첫 단계는 지역 `requireOrderAdministrator`이며, 기존 `createAuthSession().current()`로 실제 회원 상태·역할을 검사한다. 읽기 전용 페이지 guard와 달리 정지/만료 응답의 삭제 쿠키를 브라우저로 전달하기 위한 어댑터다. 추가로 `/my`를 중복 조회하지 않는다. `id`, `expectedStatus`, `statusVersion`(0 이상 Integer), `nextStatus`와 폼 입력은 bind 값도 포함해 서버에서 검증한다.
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

0단계 계획 이후 1단계 API 경계와 2·3단계 목록/상세/액션, 4단계 접근성·오류·검증을 구현했다. 목록과 상세가 같은 폼/액션 인터페이스를 사용하므로 2·3단계 UI는 함께 검증하고 커밋한다. 백엔드 PR #80은 이미 머지되었으며 기존 문서 PR #82를 이번 프론트 구현 내용으로 갱신한다. 이미 squash 머지된 백엔드 커밋은 중복 제안하지 않고, 로컬 `develop`은 변경하지 않는다. `develop` 직접 커밋/푸시·머지·다른 사람 브랜치 수정은 하지 않는다. rebase 충돌 시 abort 후 보고한다.

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
| F10 | 기존 가입·로그인·로그아웃과 다중 Set-Cookie·쿠키 만료 회귀 없음. 회원 관리 GET/CSRF 포함 PUT·마이페이지·공개 메뉴도 정상. 토큰·임의 역할 우회 없음 |
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

## 9. 최근 팀원 구현 대조와 병합 검증 조건

2026-10-26 재검토에서 원격 PR 상태와 실제 `develop` 파일 내용을 확인했다. 로컬 `develop` 브랜치를 checkout하거나 변경하지 않았으며, 아래 대조는 구현 완료 검증과 구분한다.

| 대조 대상 | 확인한 최신 결과물 | 관리자 주문 계획에 적용할 사항 |
| --- | --- | --- |
| A 인증 [#61](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/61), head `da6356a` | `BackendSession`, `createAuthSession`, `requireRole`, Proxy, 기존 전송 E2E | 기존 인증·쿠키·세션 생성자/메서드·오류 타입 유지. 권한 확인 후 `/my`를 별도로 중복 조회하지 않음 |
| B 관리자 회원 [#65](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/65), head `6f2aaa6` | page 조립, 지역 API/URL 파서, 서버 표·페이지 컴포넌트, client 상태 폼, 같은 세션의 CSRF 포함 PUT | 분리 기준·응답 검증·페이지 변환을 참고. 회원 액션에는 없는 `expectedStatus`·`statusVersion`을 주문에서 빠뜨리지 않음 |
| B 마이페이지 [#68](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/68), head `d0dede1` | `requireRole` 결과를 MemberCard에 전달, 별도의 회원 조회 모듈 제거, 기존 logout 재사용 | 인증·본인 정보 조회 중복 제거. 다른 라우트 컴포넌트를 직접 import하는 대신 주문 지역 컴포넌트로 분리 |
| C 공개 메뉴 [#77](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/77), head `51cc6ab` | `_lib/menus/api.ts`의 unknown 응답 검증, 숫자 ID, `categoryId`, 공통 `client.ts` 사용 | 공통 조회 요청기나 메뉴·장바구니 타입을 일괄 교체하지 않음. 주문의 `iced`·숫자 타입은 주문 지역에 적용 |
| C 장바구니 [#81](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/81), head `6e606ef` | 백엔드 CRUD·CUSTOMER 접근 정책까지 병합, 프론트 연결은 해당 PR 범위 밖 | CartContext·장바구니/체크아웃 계약을 E 작업에서 변경하지 않음. 장바구니 API 존재와 전체 주문 화면 연결 완료를 구분 |
| D 주문 [#69](https://github.com/likelion-backendschool-9th/3team_ncafe/pull/69), head `bd891f8` | 고객 DTO·주문 생성/멱등성·공유 모델과 관리자 전용 DTO가 공존 | `OrderResponse`·`OrderPageResponse`를 관리자 형태로 덮어쓰지 않음. 기존 키/지문·공유 모델과 본인 조회 계약 보존 |

위 PR들은 재검토 시점에 병합된 상태였다. 핵심 프론트 7개 파일(`backend-session.ts`, `client.ts`, 회원 관리 `_actions.ts`·`_lib/api.ts`, 마이페이지 `page.tsx`, 공개 메뉴 `_lib/menus/api.ts`, `playwright.config.ts`)은 원격 `develop`의 Git blob SHA와 작업 파일이 모두 같았다. 예: 세션 전송 `f9217f0`, 공통 조회 `4299015`. 이 사실은 검토 기준이 최신 파일과 같다는 뜻이며, 앞으로의 기능 병합이 충돌 없이 성공한다는 보장은 아니다.

README·기존 청사진 일부에는 회원/메뉴가 아직 목이라는 설명이 남아 있다. 규칙은 FRONTEND.md를 따르고, 진행 현황·API 계약은 최신 실제 코드·DTO와 함께 확인한다. 오래된 문구만 근거로 인증이나 이미 연결된 화면을 다시 만들지 않는다.

### 변경 파일 경계

- 주 변경 범위는 `app/admin/orders/**`와 주문 E2E다. 이름·타입·CSS·컴포넌트는 주문 폴더에 두어 다른 기능과 섞이지 않게 한다.
- 기본 공통 변경은 `app/_lib/api/backend-session.ts`의 추가 진입점이다. 실검증에서 추가로 필요해진 `proxy.ts`의 주문 POST 처리와 테스트 fixture 변경은 10장에 이유·영향을 기록한다. 기존 `client.ts`, `auth.ts`, 세션·Proxy, 전역 레이아웃/스타일, Playwright의 포트·workers·testDir·기존 fixture 계약을 일괄 개편하지 않는다. 추가 변경이 꼭 필요하면 먼저 영향과 소비자를 계획/PR에 기록한다.
- `docs/FRONTEND.md`는 다른 팀도 수정하는 파일이므로 주문 행과 필요한 계약 설명만 변경한다. 다른 담당자의 진행 상태를 덮어쓰지 않는다.
- 회원 관리가 수정한 형제 key 중복 문제도 반영한다. 주문의 필터·안내·섹션 경계를 구분한 key를 사용하고, 페이지 이동·보기 전환 시 폼이나 행이 누적되지 않는지 확인한다.

### 구현 후 반드시 확인할 통합 결과

| 확인 범위 | 병합 전 통과할 결과 |
| --- | --- |
| A 인증 | 기존 `backend-session.spec.ts`와 `session-auth.spec.ts` 통과. 모든 쿠키 전달·세션 ID 변경·만료·가입 후 로그인·로그아웃/Proxy 유지 |
| B 회원 | 실제 관리자 세션에서 목록·검색·페이지·상세·CSRF 포함 정지/해제 정상. 마이페이지는 기존 Member/로그아웃 흐름 유지 |
| C 메뉴 | 공개 목록·카테고리·slug 상세·홈 추천과 담기 경계 정상. 로그인 정보가 다른 사용자 요청과 섞이지 않음 |
| D/E 주문 | 고객 생성 계약의 주문을 관리자 화면에서 처리한 뒤 고객 조회 API의 같은 주문 상태 확인. 고객 HTTP/화면 선행이 없으면 해당 검증을 미완료로 명시 |
| 테스트 간 간섭 | 전용 DB·계정·주문 키/fixture를 식별하고 각 테스트가 만든 데이터만 정리. 인증 테스트 사용자를 전역 초기화하거나 기존 시나리오/포트 설정 변경 금지 |
| 병합 결과 | 구현 직전/최종 재검토에서 최신 공통 파일과 열린 PR을 확인. 기능별 테스트뿐 아니라 실제 합쳐진 코드에서 lint·typecheck·build·위 회귀 확인. rebase 충돌 시 abort 후 보고 |

위 소스 대조표는 착수 전 기록이다. 구현 후 실제 브라우저·DB 검증은 10장의 실행 결과로 구분하며, 향후 모든 팀 작업의 충돌·오류가 없음을 보장하지 않는다.

계획 문서 보완 당시에는 `npm run lint`, `npm run typecheck`, 기존 `npm run test:e2e -- e2e/backend-session.spec.ts`의 전송 검사 3개가 통과했다. 마지막 3개는 주입한 fetcher로 쿠키·CSRF·오류와 안전한 next를 검사하는 기존 테스트이며, 실제 브라우저/DB나 새 주문 연결 구현을 검증한 결과가 아니다.


## 10. 구현 결과와 실검증 기록 (2026-10-26)

### 최종 구현

- 목록/상세의 목 의존을 제거하고 계획의 지역 `_lib`·서버 표시 컴포넌트·client 폼/대화상자로 분리했다. 각 page는 60줄 이내의 조립 코드다.
- 검색·상태·정렬·보기와 세 그룹의 DB 페이지/복귀 주소를 유지한다. 상단 요약은 필터와 독립적이고, API 실패를 0건으로 바꾸지 않는다. 마지막 유효 페이지 재조회도 적용했다.
- 상태 선택지는 응답 `allowedStatuses`, 변경 기준은 `expectedStatus`·`statusVersion`이다. 명시적 변경 버튼/pending을 사용하고 취소는 접수에서 확인 후 사유 없이 처리한다. 409에서 새 상태/버전을 보여 주며 재전송하지 않는다.
- 숫자 주문번호 전체·품목 ID key·당시 이름/가격/이미지·`iced`·nullable 요청사항·원화·한국 시각을 표시한다. 상세 잘못된 ID/404, 401/403/CSRF 오류와 목록 조회 재시도 경계를 구현했다.
- title/noindex, 보이는 폼 label, status/alert, 입력 오류 포커스, 모달 초기/복귀 포커스와 Tab 순환·Enter·Esc를 적용했다. 취소 영역 글자 대비를 수정했다.

### 실검증에서 추가된 최소 변경

1. **`frontend/proxy.ts`:** 세션 만료 후 기존 화면의 Server Action POST에 일반 HTTP redirect를 반환하면 Next 16.3.5의 fetch Action 응답 해석이 실패하는 문제가 재현됐다. `/admin/orders` 및 하위 경로의 POST만 Next Action handler까지 전달한다. 주문 GET과 다른 도메인의 Proxy 동작은 유지한다. 액션은 첫 단계에서 실제 세션/활성 상태/관리자 역할을 확인하고 백엔드도 ADMIN 권한·CSRF를 검사한다. **A 담당자 리뷰 대상**이다.
2. **지역 액션 guard:** 페이지의 읽기 전용 `requireRole`는 쿠키를 쓸 수 없다. 정지/만료 응답의 삭제 쿠키까지 전달하도록 액션에서 기존 `createAuthSession().current()`를 호출하는 `requireOrderAdministrator`를 사용한다. 세션/로그인 정책을 새로 만들거나 공통 `session.ts`·`auth.ts`를 변경하지 않았다.
3. **테스트 fixture:** 기존 Docker DB 계약을 기본으로 유지하고 localhost의 임시 PostgreSQL을 사용할 `E2E_TEST_DB_URL`만 선택적으로 추가했다. 실제 DB/사용자를 매번 확인한다. 주문 fixture는 자기 회원/주문/메뉴만 정리한다. 중계 서버의 장애 주입은 `E2E_ORDER_FAULTS=1`에서만, 해당 테스트 세션별로 작동한다. 제품 API에는 fixture 경로가 없다.
4. **기존 인증 E2E 정합성:** B의 MemberCard가 회원 번호를 표시하지 않는 최신 UI에 맞게 화면의 번호 노출이 없음을 검사한다. API의 숫자 ID 검사는 유지했다. 기존 8개 가입/로그인/로그아웃/권한 시나리오는 유지한다.

### 실행 환경과 결과

개발 `.env`·DB와 분리된 임시 PostgreSQL 16(`ncafe_auth_e2e`, `ncafe_test`, localhost:15432), 실제 Spring 서버(:18080), 테스트 중계(:18081), Next **production build/start**(:13000), Chromium을 사용했다. 비밀번호/토큰/세션 쿠키는 Git과 보고서 본문에 넣지 않는다. 실행 절차는 [E2E 안내](../../../frontend/e2e/README.md)에 있다.

| 검증 | 결과·범위 |
| --- | --- |
| lint / typecheck / build | 통과. Next 16.3.5 production 빌드 |
| 최종 전체 프론트 검사 | **28개 일괄 통과(23.7초)**. 아래 전송/데이터 12개+인증 브라우저 8개+주문 브라우저 8개 |
| 프론트 전송·데이터 검사 | 12개: 기존 인증 전송 3개+업무 GET/PUT/CSRF 3개+주문 응답/URL/페이지 6개 |
| 실제 인증 브라우저 | 기존 8개: 가입·자동 로그인 실패·입력 검증·다중 탭·로그아웃·외부 next·CSRF·관리자/고객 |
| 실제 주문 브라우저 | 8개: 37건 fixture(처리 중 13/완료 12/취소 12), 독립 페이지·필터/보기/복귀·스냅샷·인접 이동/되돌리기·접수 취소·409·마지막 페이지·401/403/404·정지/역할 변경·CSRF·503/잘못된 응답·재시도 |
| B/C 회귀 | 회원 검색/상세·CSRF 정지/해제, 고객 마이페이지, 공개 메뉴 검색/카테고리/slug 상세·기존 localStorage 담기 통과. 장바구니 서버 연결 완료를 뜻하지 않음 |
| axe / 키보드 / 화면 | 주문 목록 표·그리드·상세의 `main`과 취소 dialog: serious/critical 0건. 390px 모바일 가로 넘침 없음, 데스크톱/모바일 스크린샷·Tab/Enter/Esc·포커스 확인 |
| Lighthouse 13.5.0 | 실제 관리자 세션의 `/admin/orders`, desktop: 접근성 100 / 권장사항 100. 성능·SEO 카테고리는 실행하지 않음. 점수 외 진단에는 기존 공통 헤더 브랜드 링크의 보이는 영문/aria-label 불일치가 남음(공통 컴포넌트 범위) |
| 백엔드 `./gradlew test` | 총 398개 중 실패/오류 0, skipped 4. 별도 Testcontainers integrationTest 실행 결과와는 구분 |

F1~F9와 담당 화면의 F11을 위 실제 브라우저/DB 검사로 확인했다. F10은 명시한 인증·B/C 회귀 범위에서 통과했고, F12의 명령 결과도 기록했다. **고객 주문 생성→관리자 처리→고객 HTTP/화면 재조회, 회원 FK 통합, 관리자 홈 집계·공개 홈의 남은 목 의존, 전역 skip link/헤더 갭은 미완료**다. 기존 인증 검사 중 홈/관리자 홈으로 이동하는 항목은 URL·세션 결과를 확인하며, 해당 목 대시보드의 production 콘텐츠 정상화를 증명하지 않는다.

백엔드 Order/고객 DTO·장바구니·SecurityConfig, 회원/메뉴 프론트와 공통 `client.ts`는 수정하지 않았다. 최종 푸시 전 origin/develop을 다시 확인하고 작업 브랜치에서만 rebase한다. 로컬 develop 위치 유지·충돌 시 abort·사람만 머지 원칙을 지킨다.


### 최종 원격 재확인

`git fetch origin` 뒤에도 `origin/develop`은 `5eeab69`였다. 새로 확인된 미병합 `origin/feature/cart-frontend`(`bd3d646`)의 실제 코드도 읽었다. C는 별도 `api/csrf.ts`를 추가하고 장바구니/담기를 서버로 전환하며, 이번에 수정한 `backend-session.ts`·주문 코드·`proxy.ts`를 변경하지 않는다. E 회귀 fixture는 서버 장바구니 또는 현재 localStorage에 실제 담긴 결과를 검사하고, 자기 고객의 서버 cart 행도 정리하도록 보완했다. 공통 FRONTEND 문서는 임시 파일의 3-way `merge-file` 검사에서 충돌 없이 합쳐졌다. 이 검사는 다른 사람 브랜치·작업 트리·develop을 바꾸지 않았으며, C 브랜치 전체를 합친 빌드/브라우저 검증과는 구분한다.
