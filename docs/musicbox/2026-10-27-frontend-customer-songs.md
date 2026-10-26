# 고객 신청곡 프론트 API 연결

## 한눈에

- 끝나면 아래가 목 저장소 대신 백엔드 API(#79·#89·#90)로 동작한다. 전용 DB로 돌린 e2e와 `lint`·`typecheck`가 통과한다.
  - 대상 화면: `/musicbox`, `/my/songs`, 홈 뮤직박스 칸
  - 열린 화면은 3초마다 `GET /api/v1/songs/now`의 `revision`만 확인한다.
- 결정: Q1 A, Q2 A (10-27 승인). #85는 10-27 develop에 머지돼 단계 6도 이 브랜치에서 한다.
- 규모: 7단계, 약 7시간

## 질문 (10-27 결정: 둘 다 A)

- Q1: #85와 겹치는 부분을 어떻게 할까? 답에 따라 단계 6과 PR 순서가 달라진다.
  - 겹치는 곳:
    - 관리자 화면(#85)도 `MusicBoxRefresher`에 `version` 문자열을 넘긴다.
    - 관리자 화면(#85)이 `(public)/musicbox/_actions`의 `finishPlaying`·`reportDuration`(목 저장소 호출)을 import한다.
  - #85만 머지되면 생기는 문제:
    - 관리자 화면은 API 목록으로 version을 계산하는데, `/api/music-box/version`은 목 저장소로 계산한다. 두 값이 달라서 관리자 화면이 3초마다 새로 고쳐진다.
    - 영상 종료 통지는 목 저장소로 간다.
  - (A, 추천) #85 머지를 기다린 뒤 내 PR에서 관리자 쪽 두 곳도 함께 바꾼다 (단계 6).
    - `revision`을 넘긴다.
    - 영상이 끝나면 #85의 `finishCurrent` 액션을 부른다.
    - 단계 1~5는 #85와 파일이 겹치지 않으니 먼저 진행한다.
  - (B) #85를 기다리지 않는다.
    - `MusicBoxRefresher`가 `version`과 `revision`을 둘 다 받게 해서 관리자 화면은 그대로 둔다.
    - 목 저장소와 version 라우트는 남는다.
- Q2: 홈(`/`)과 `/my/songs`가 공개 `SongsController`의 조회 API를 보조로 써도 될까? 답에 따라 S12~S14와 FRONTEND.md 2-3이 달라진다.
  - 이유:
    - 홈의 주 컨트롤러 엔드포인트 `GET /index/songs`는 아직 없다.
    - `/my/songs`의 현재 곡 표시는 2-3에서 "근거 없음, 6-2에서 정한다"로 남아 있다.
    - 변경 감지에 쓰는 `revision`은 `GET /songs/now`에만 있다.
  - (A, 추천) 보조로 쓴다.
    - `/`: `GET /musicbox/songs`, `GET /songs/now`
    - `/my/songs`: `GET /songs/now`, `GET /musicbox/songs`(재생 대기 순번 계산용)
    - 2-3 예외 목록과 백엔드 청사진에 2줄을 추가한다.
    - 백엔드 변경은 없다.
  - (B) `GET /index/songs`(현재 곡, 다음 3곡, `revision`)를 백엔드에 새로 만든다 (약 +1.5시간).
    - `/my/songs`는 현재 곡 부스와 재생 대기 순번을 뺀다.

## 1. 공개 뮤직박스 조회 (R1)

`/musicbox`는 `GET /musicbox/songs`와 `GET /songs/now`로 현재 곡, 목록, 오늘 접수 수를 그린다.

S1 정상
- Given 백엔드에 재생 중 1곡(`id=20`), 플레이리스트 2곡, 접수 1곡, 재생 완료 1곡이 있다.
- When 비로그인으로 `/musicbox`를 연다.
- Then 표에 5행이 "재생 중 → 재생 대기 1·2 → 접수 → 재생 완료" 순서로 있다.
- Then 현재 곡 칸에 `id=20`의 곡명과 가수가 보인다.

S2 빈 뮤직박스
- Given 신청곡이 0곡이다.
- Then 현재 곡 칸은 "재생 중인 곡 없음" 상태이고, 표는 빈 상태 문구를 보여 준다.

S3 백엔드 오류
- Given 백엔드가 꺼져 있다.
- Then 공통 `error.tsx` 화면이 보이고, 목 데이터는 보이지 않는다.

## 2. 변경 감지 (R2)

열린 화면은 3초마다 브라우저에서 `GET /api/v1/songs/now`를 부르고, `revision`이 처음 그릴 때와 다르면 `router.refresh()`한다.

S4 변화 감지
- Given `/musicbox`를 `revision=5`로 그렸다.
- When 관리자가 곡 하나를 플레이리스트에 담는다 (`revision=6`).
- Then 3초 안에 표에 그 곡이 "재생 대기"로 나타난다. 페이지는 다시 불러오지 않는다.

S5 곡 종료
- Given 현재 곡의 `endsAt`이 `serverNow`보다 10초 뒤다.
- Then 10.3초 뒤 화면이 새로 고쳐지고 다음 곡이 현재 곡이 된다.

S6 일시 오류
- Given 폴링 요청 한 번이 네트워크 오류다.
- Then 화면은 그대로이고, 다음 폴링에서 다시 확인한다.

## 3. 신청곡 접수 (R3)

고객 회원은 Server Action으로 `POST /musicbox/songs`를 CSRF 토큰과 함께 보낸다.

S7 정상
- Given 고객 회원 "민지"로 로그인했다.
- When 곡명 " 밤편지 ", 가수 "아이유", 사연 "첫 출근"을 제출한다.
- Then `/musicbox?submitted=1`로 이동하고 접수 안내가 보인다.
- Then 표의 접수 행에 "밤편지 · 아이유 · 민지"가 있다.

S8 입력 오류
- Given 곡명이 101자다.
- Then 백엔드를 호출하지 않는다.
- Then 곡명 칸 옆에 "곡명은 1~100자로 입력해 주세요."가 보이고, 입력값은 그대로 남는다.

S9 비로그인·관리자
- Given 비로그인이다.
- Then 폼 대신 로그인 안내가 보인다.
- Given 관리자 계정이다.
- Then 폼 대신 "신청곡은 고객 회원만 보낼 수 있어요." 안내가 보인다.
- When 액션을 직접 호출한다.
- Then 백엔드를 호출하지 않고 같은 오류를 돌려준다.

S10 백엔드 거절
- Given 백엔드가 `400 {code:"INVALID_INPUT", message:"사연을 입력해 주세요."}`를 돌려준다.
- Then 폼 위에 그 메시지가 보이고, 입력값은 그대로 남는다.

## 4. 내 신청곡 조회·삭제 (R4)

`/my/songs`는 `GET /my/songs`로 내 곡을, `GET /songs/now`로 현재 곡을 보여 준다 (Q2). 삭제는 `DELETE /my/songs/{id}`다.

S11 정상
- Given 고객 7의 곡이 3개 있다: `playing` 1, `queued`(플레이리스트 2번째) 1, `cancelled` 1.
- When `/my/songs`를 연다.
- Then 메모 3장이 "재생 중 → 재생 대기 2 → 취소됨" 순서로 보인다.
- Then 재생 중인 곡에는 삭제 버튼이 없다.

S12 삭제
- When `queued` 곡의 삭제를 확인한다.
- Then `/my/songs?deleted=1`로 이동하고, 그 곡이 목록과 `/musicbox` 표에서 사라진다.

S13 삭제 거절
- Given 삭제 직전에 그 곡이 재생 중이 됐다 (백엔드 `409`).
- Then `/my/songs?error=delete`로 이동하고 "재생 중인 곡은 삭제할 수 없어요" 안내가 보인다.

## 5. 홈 뮤직박스 칸 (R5)

홈 칸은 현재 곡과 플레이리스트 앞 3곡을 API로 보여 준다 (Q2).

S14 정상
- Given 플레이리스트가 4곡이다.
- When `/`를 연다.
- Then 다음 차례 메모가 플레이리스트 순서대로 3장이고, 캡션은 "재생 대기 4곡"이다.

## 6. 사연 읽기 (R6)

`/api/story-speech`는 목 대신 서버에서 `GET /songs/now`를 불러 현재 곡을 확인한다.

S15 정상
- Given 현재 곡이 `id=20`이고 사연이 있다.
- When `{"requestId":20}`으로 요청한다.
- Then Typecast를 호출해 `audio/mpeg`를 돌려준다 (키가 없으면 `503`. 지금과 같다).

S16 다른 곡
- Given 현재 곡이 `id=21`이다.
- When `{"requestId":20}`으로 요청한다.
- Then `404`를 돌려준다.

## 7. 목 저장소 정리 (R7)

고객 쪽에서 쓰던 재생 통지 액션, version 라우트, 목 저장소를 지운다.

S17 정리
- Given 단계 1~6을 마쳤다.
- Then `grep -r "mock/music-box\|api/music-box\|finishPlaying\|reportDuration" frontend/app`의 결과가 0건이다.
- Then `npm run typecheck`가 통과한다.
- Q1이 B이면 관리자 화면이 쓰는 부분은 남긴다.

## 범위 밖

- 관리자 선곡 화면의 API 연결. #85(cha)가 담당한다. Q1이 A일 때 공용 부품 두 곳만 바꾼다.
- 손님 화면의 재생 종료·영상 길이 통지. 백엔드 계획 Q2에서 넣지 않기로 했다. 곡 전환은 서버가 시간으로 판단한다.
- `user_id` FK. 백엔드 남은 작업이다.
- 공통 갭(`<main>` 위치, metadata, 다른 라우트 `_components` import). 이 쌍에서 고치지 않는다. PR 본문에 남긴 항목으로 적는다.

## 작업 순서

1. 공용 타입과 조회 함수 — S1, S2, S3 (약 1.5시간)
   - 파일:
     - `app/_lib/songs/types.ts`: `SongResponse`, `NowPlaying`, `MusicBoxSongs` (DTO와 같은 이름·타입)
     - `app/_lib/songs/api.ts` (`server-only`): `fetchMusicBoxSongs`, `fetchNowPlaying`, 응답 검증
     - `(public)/musicbox/page.tsx`
     - 공용 컴포넌트(`RequestTable`, `NowPlaying`, `DjBooth`, `RequestMemo`)의 타입을 `MusicRequest`에서 `SongResponse`로 바꾼다 (id `string` → `number`).
   - 확인: `npm run typecheck`, `npm run lint`
2. 변경 감지 — S4, S5, S6 (약 1시간)
   - 파일: `MusicBoxRefresher.tsx` (props `revision: number`, `/api/v1/songs/now` 폴링). 고객 화면 3곳이 `revision`을 넘긴다.
   - 확인: e2e S4
3. 신청곡 접수 — S7~S10 (약 1시간)
   - 파일: `(public)/musicbox/_actions.ts`(`submitMusicRequest`: `requireRole` 대신 회원·역할 확인 → 검증 → `apiFetch` + `csrfHeaders`), `RequestForm.tsx`(필드 오류·입력값 유지·관리자 안내)
   - 확인: e2e S7~S9
4. 내 신청곡 — S11~S13 (약 1시간)
   - 파일: `(customer)/my/songs/page.tsx`, `_actions.ts`
   - 확인: e2e S11~S13
5. 홈 칸·사연 읽기 — S14~S16 (약 1시간)
   - 파일: `MusicBoxHighlight.tsx`, `api/story-speech/route.ts`
   - 확인: e2e S14. S15·S16은 `curl`로 확인한다 (Typecast 키가 없으면 `503`/`404`만 본다).
6. #85 접점과 목 정리 — S17 (약 1시간)
   - 파일:
     - `admin/songs/page.tsx`: `revision` 전달
     - `admin/songs/_components/OnAirPlayer.tsx`: 종료 시 `finishCurrent`
     - 삭제: `(public)/musicbox/_actions.ts`의 `finishPlaying`·`reportDuration`, `api/music-box/version/route.ts`, `_lib/mock/music-box.ts`
   - 확인: `grep` S17, `npm run typecheck`
7. 문서와 e2e 정리 (약 0.5시간)
   - 파일:
     - `docs/FRONTEND.md`: 2-2 비고, 2-3 예외 2줄(Q2), 2-2의 "페이지가 아닌 라우트 핸들러"에서 version 삭제, 8-2 세 쌍의 상태
     - `backend/docs/2026-10-20-backend-blueprint.md`: 보조 조회 2줄(Q2)
     - `e2e/musicbox.spec.ts`
   - 확인: `npm run test:e2e -- musicbox`

## 테스트

- e2e는 `frontend/e2e/README.md`의 전용 컨테이너 DB(`ncafe_auth_e2e`, 포트 15432)만 쓴다. `backend/.env`의 DB에는 연결하지 않는다.
- 곡 준비는 `fixtures/admin.ts`의 `adminApi`로 한다: 고객 가입 → 신청 → 관리자가 플레이리스트에 담기(길이 포함) → 자동 재생.
- 시나리오와 e2e 케이스는 1:1로 맞춘다. 단, S3·S6은 수동으로 확인한다 (백엔드 중지, DevTools 오프라인).

## 브랜치·커밋

- 브랜치: `feature/musicbox-frontend-api` (`origin/develop`에서 분기)
- 커밋:
  - `docs: 고객 신청곡 프론트 연결 계획 추가` — 이 문서
  - `feat: 뮤직박스 공개 조회 API 연결 추가` — 단계 1
  - `feat: 뮤직박스 변경 감지를 revision 폴링으로 수정` — 단계 2
  - `feat: 신청곡 접수 API 연결 추가` — 단계 3
  - `feat: 내 신청곡 조회·삭제 API 연결 추가` — 단계 4
  - `feat: 홈 뮤직박스와 사연 읽기 API 연결 추가` — 단계 5
  - `refactor: 뮤직박스 목 저장소 삭제` — 단계 6
  - `docs: 뮤직박스 페이지-컨트롤러 매핑 수정`, `test: 뮤직박스 e2e 추가` — 단계 7
- PR 대상은 `develop`이다. 변경이 400줄을 넘으면 단계 1~3과 4~7로 나눈다.

## 가정

- 신청 폼은 고객 회원에게만 보인다. 회원·역할은 지금처럼 `getCurrentUser()`로 확인한다.
- 화면 검증 규칙은 백엔드 `CreateSongRequest`와 같다: 앞뒤 공백 제거 후 곡명 1~100자, 가수 1~80자, 사연 1~500자.
- 오류 처리: 필드 오류는 프론트 검증으로 표시하고, 백엔드 오류는 `message`를 폼 위에 표시한다.
- 폴링 간격 3초와 종료 후 0.3초는 지금 값 그대로 둔다. 폴링은 브라우저에서 rewrites(`/api/v1/:path*`)로 직접 호출한다. `GET`이고 `permitAll`이라 CSRF·쿠키가 필요 없다.
- 재생 위치는 `NowPlaying.serverNow`와 `current.endsAt`으로 맞춘다. 프론트에서 `Date.now()`로 서버 시각을 만들지 않는다.
- 손님 화면 플레이어는 영상이 끝나도 서버에 알리지 않는다. 대신 `MusicBoxRefresher`의 종료 타이머가 화면을 새로 고친다.
- 길이를 모르는 곡(`durationSeconds=null`)은 관리자 화면 플레이어의 종료 통지로만 넘어간다 (Q1 A).
- 손글씨 구분: `/my/songs`에서 현재 곡이 내 곡인지는 `current.id`가 내 곡 id 목록에 있는지로 판단한다. 응답에 `userId`가 없기 때문이다.
- 신청 번호(`requestNumber`)는 `playlist + inbox + played + 현재 곡` 수에 1을 더한다. 취소된 곡은 세지 않는다.
- 변경 후에는 `/`, `/musicbox`, `/my/songs`, `/admin/songs`를 `revalidatePath`한다.

## 참고

- 백엔드 계약 (10-27 develop `72da8e7` 확인):
  - `SongResponse` 필드: `id`(Long), `requesterName`, `songTitle`, `artist`, `story`, `status`(소문자), `youtubeVideoId`, `playlistOrder`, `createdAt`, `playedAt`, `startedAt`, `durationSeconds`. `userId`는 없다.
  - `GET /musicbox/songs`는 `{playlist, inbox, played}`를 돌려준다.
  - `GET /songs/now`는 `{current, serverNow, revision}`을 돌려주고, `current`에는 `endsAt`이 있다.
  - 권한: 조회는 누구나, 신청과 `/my/songs/**`는 `CUSTOMER`이고 쓰기 요청에는 CSRF가 필요하다 (#90).
- 프론트 공통 (10-27 확인):
  - `app/_lib/api/client.ts`에 `apiFetch`와 `csrfHeaders`가 있다. `admin/menus/_actions.ts`가 이 방식을 쓴다.
  - `next.config.ts`는 `/api/v1/:path*`만 rewrites한다.
  - `proxy.ts`는 `/my/*`를 보호한다.
- 목 의존 (10-27 `grep` 확인):
  - 고객 쪽: `(public)/musicbox` page·actions·컴포넌트 5개, `(customer)/my/songs` page·actions, `MusicBoxHighlight`, `api/music-box/version`, `api/story-speech`
  - 관리자 쪽: `admin/page.tsx`, `admin/songs/*`. `admin/songs/*`는 #85가 전환하고, `admin/page.tsx`는 `/admin` 쌍의 작업이다.
- #85 `feature/admin-songs-frontend` (10-26 15:06 UTC 갱신, OPEN):
  - 새 파일: `admin/songs/_lib/types.ts`(`SongResponse`), `helpers.ts`(`musicBoxVersion`을 API 목록으로 계산)
  - `OnAirPlayer`는 아직 `(public)/musicbox/_actions`의 `finishPlaying`·`reportDuration`을 쓴다.
- FRONTEND.md 2-3: `/my/songs`의 현재 곡 표시는 예외로 인정되지 않았고, 6-2에서 정하기로 남아 있다.
- 백엔드 계획 `2026-10-25-backend-customer-songs.md`: Q2에서 재생 통지를 넣지 않기로 했다. 가정 R5에서 조회는 비로그인도 허용한다.
