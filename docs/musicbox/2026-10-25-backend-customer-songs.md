# 고객 신청곡 백엔드 계획

## 한눈에

- 끝나면: 아래 API를 단위·MockMvc 테스트로 확인할 수 있다.
  - 회원: 신청곡 접수, 내 신청곡 조회·삭제
  - 방문자: 신청곡 공개 목록과 현재 곡 조회
  - 곡 전환은 서버가 `startedAt + durationSeconds`로 판단한다. 손님 화면은 판단에 관여하지 않는다.
- 기준: [백엔드 청사진](../../backend/docs/2026-10-20-backend-blueprint.md)의 Controller 구조·WBS API 경로와 [DB 설계](../database-design.md)의 뮤직박스 규칙을 따른다. [카테고리 계획](../admin/categories/2026-10-21-backend-category-management.md)의 구현 기준 1~8도 따른다.
  - 공용 엔티티는 관리자 신청곡 PR #78(cha)이 DB 설계대로 고쳐서 만들었다 (10-26 합의·반영). 이 PR은 그 위에서 작업한다.
  - 10-26부터 cha와 추가 조율은 하지 않는다. 이 PR만으로 구조가 맞도록 필요한 공용 코드 수정도 직접 한다.
- 결정 필요: 없음
- 현재 (10-26): 단계 1~6 완료. `./gradlew test` 105개 통과. 남은 것은 PR #78 머지 후 develop 위로 옮기기.
  - 테스트는 모두 mock·MockMvc·Hibernate 메타데이터로 실행했다. `backend/.env`가 실제 DB를 가리키고 `ddl-auto: update`라서, 앱 기동·`@SpringBootTest`는 실제 DB 스키마와 데이터를 바꾸므로 실행하지 않았다.
- 규모: PR 1개, 6단계, 약 10시간
- 위치: `docs/musicbox/`의 고객 쪽 백엔드 계획. 프론트 연결은 별도 계획으로 쓴다.

## 구현 결과 (10-26)

계획과 달라진 점:

- 내 신청곡 목록(R4)도 공개 조회처럼 먼저 정리한다. 정리하지 않으면 끝난 곡이 `playing`으로 보인다.
- 잠그기 전 확인 값은 `entity/song/SongTiming`(JPQL 생성자 조회), 끝나는 시각 계산은 `Song.endsAt(startedAt, durationSeconds)` 하나로 모았다.
- 입력 길이 상수와 공백 제거는 `entity/song/SongFields`(`MenuFields` 방식), 고정 시각 테스트용 `Clock`은 `config/ClockConfiguration`에 둔다.
- 응답은 PR #78의 `SongResponse`를 그대로 쓴다. 계획의 `updatedAt` 필드는 PR #78 파일을 고치지 않으려고 넣지 않았다.
- 신청곡 접수(R3)는 `my/SongsController`가 아니라 공개 `SongsController`·`service/SongsService`에 둔다 (10-26 결정). 경로가 `/my`가 아닌 `/musicbox/songs`이고, 같은 경로의 공개 목록과 한 Controller에 모은다. `my/`는 `/my/songs` 조회·삭제만 맡는다.
- 코드 리뷰 반영 (10-26): 재생 중 바로 재생 NPE, 재생 중인 곡 취소 후 멈춤, 순서 변경 방향 누락을 고쳤다. 바로 재생 NPE는 단계 3에서 재생 시 `playlistOrder`를 비우게 바꾼 것이 원인이었다.
- 공개 응답의 `playlistOrder`는 별도 처리 없이 엔티티가 보장한다. `play(at)`·`finish(at)`과 PR #78의 `cancel`·`returnToInbox`·`markAsPlayed`가 `queued`가 아니게 될 때 순서를 비운다.

실제 DB 없이는 확인하지 못한 것:

- PostgreSQL에서 테이블·컬럼이 실제로 만들어지는지 (S1은 Hibernate 메타데이터로만 확인)
- `findPlayingTiming` JPQL과 파생 쿼리가 실제 DB에서 실행되는지 (JPQL은 Hibernate 파싱, 파생 쿼리 이름은 Spring Data `PartTree`로만 확인)
- 잠금 동시성과 `playing` 최대 1건 (S3)
- Spring 앱 전체 기동 (Bean 이름·`Clock` 주입)

## 결정

- Q1 현재 회원: #69(`feature/order-api`)와 **같은 파일 4개**(`AuthenticatedUser`, `CurrentUserContext`, `CurrentUserConfiguration`, `AuthenticationRequiredException`)와 `ApiExceptionHandler`의 401 핸들러를 같은 내용으로 쓴다.
  - 구현체가 없으면 회원 API는 `401`이다.
  - #61 세션 인증이 머지되면 `SessionUserDetails` 기반 구현체 하나만 추가한다.
  - 10-27 반영: `common/security/SessionCurrentUserContext`를 추가하고, 항상 401을 던지던 `CurrentUserConfiguration`은 삭제했다.
- Q2 재생 통지: 넣지 않는다. 곡 전환은 서버가 판단한다.
  - 지금 프론트의 종료·길이 통지는, 서버가 영상 길이를 모를 때 쓰는 보조 수단이다.
  - 영상 길이는 관리자가 플레이리스트에 담을 때 함께 저장한다 (PR #78, 10-26 합의).
- Q3 부분 유니크 인덱스: 이번에는 만들지 않는다.
  - `music_box_state` 행 잠금과 서비스 규칙으로 막는다.
  - 인덱스는 카테고리 `is_fallback`과 함께 팀 결정 뒤 PostgreSQL 검증 작업에서 추가한다.
- 정리 구조 (10-26): 정리 규칙은 도메인 객체 `entity/song/SongSettlement`, 잠금과 실행은 공용 부품 `service/support/MusicBoxSettler`가 맡는다.
  - 처음에는 서비스마다 복사했지만, 관리자 쪽에 정리가 빠지는 문제(리뷰)가 생겨 한 곳으로 모았다.
  - `MusicBoxSettler`는 서비스가 아니고 자기 트랜잭션을 만들지 않는다(`MANDATORY`). 그래서 정리 쓰기가 다른 트랜잭션이나 읽기 전용 트랜잭션에 섞이지 않는다.
  - 위치는 청사진의 시스템 폴더(공개·`my`·`admin`)와 구분되는 `service/support/`다. `musicbox`는 화면 이름, `song`은 도메인 이름이라 시스템 폴더 자리에 두면 기준이 섞인다.
- 조율 없이 진행 (10-26): cha와 더 조율할 수 없으므로, 아래는 이 PR이 직접 한다.
  - `music_box_state` `id=1` 행 생성: `MusicBoxStateInitializer` (단계 3). 이미 있으면 만들지 않으므로 나중에 PR #78에 같은 처리가 들어와도 결과가 같다.
  - 엔티티 보완(시각 메서드, `playlistOrder` 정리, 시각 컬럼 `TIMESTAMPTZ`, `requesterName` 50자): 단계 3. 고객 API가 바로 쓰는 부분이라 미루면 임시 코드가 생긴다.
  - 관리자 조작의 시간 경과 정리 호출: 단계 6. 처음에는 PR #78 머지 뒤로 미뤘지만, PR #78이 10-25 이후 바뀌지 않아 이 브랜치에서 바로 했다.

## 1. 신청곡 저장 형식과 상태 규칙 (R1)

신청곡과 뮤직박스 상태는 DB 설계 그대로 저장하고, 상태는 정해진 방향으로만 바뀐다.

R1은 PR #78(cha)이 구현했다. 이 PR은 단계 3에서 부족한 부분만 채운다: 컬럼 정의(S1), `id=1` 행(S1b), 시각을 받는 상태 메서드(S2, S2b).

S1 저장 형식
- Given `Song`, `MusicBoxState` 엔티티와 `PluralTableNamingStrategy`가 있다.
- When Hibernate 메타데이터를 만든다 (`PluralTableNamingStrategyTest` 방식).
- Then `music_requests`의 `song_title`은 100자, `artist`는 80자다. (고침 10-27: 테이블 이름을 `songs`로 바꿨다)
- Then `story`는 `text`, `user_id`와 `status`는 `NOT NULL`이다.
- Then `youtube_video_id`, `playlist_order`, `duration_seconds`, `started_at`, `played_at`은 `NULL`을 허용한다.
- Then 시각 컬럼(`created_at`, `updated_at`, `started_at`, `played_at`, `music_box_state.updated_at`)은 `TIMESTAMPTZ`다.
- Then `requester_name`은 50자다 (회원 이름 최대 50자).
- Then `music_box_state`에는 `revision`과 `updated_at`이 있다.

S1b 뮤직박스 상태 행
- Given `music_box_state`에 행이 없다.
- When 애플리케이션 초기화를 두 번 실행한다.
- Then `id=1`, `revision=0`인 행이 하나만 있다.

S2 잘못된 상태 이동
- Given `pending`인 신청곡이 있다.
- When 엔티티의 `play(at)`를 호출한다.
- Then `SongException(CONFLICT)`이 발생하고 상태는 `pending`으로 남는다.

S2b 재생·종료 시각과 순서
- Given `queued`이고 `playlistOrder=1`인 곡이 있다.
- When `play(12:03:21)` 뒤 `finish(12:05:02)`를 호출한다.
- Then `startedAt`은 재생 중에 `12:03:21`이었다.
- Then 끝난 뒤 `playedAt=12:05:02`이고 `playlistOrder=null`이다 (DB 설계: 순서는 `queued`에서만).

S3 재생 중 최대 1건 (PostgreSQL 검증 남음)
- Given `playing`인 곡이 1건 있다.
- When 다른 곡을 `playing`으로 바꾸는 요청이 동시에 2건 들어온다.
- Then `playing`은 1건뿐이다.

## 2. 시간 경과 정리 (R2)

곡 상태를 읽거나 바꾸기 전에, 서버가 `startedAt + durationSeconds`로 끝난 곡을 정리하고 다음 곡을 재생한다.

정리 규칙과 실행을 나눈다 (10-26 결정, 카테고리 구현 기준 1·2).

- 규칙: `entity/song/SongSettlement`. Repository·트랜잭션 없이, 넘겨받은 `Song` 객체만 바꾼다.
  - `settle(Song playing, List<Song> queue, Instant now)`: 끝난 곡을 `finish(endsAt)`, 다음 곡을 `play(시작 시각)` 처리하고, 여러 곡이 지났으면 반복한다. 바뀐 게 있으면 `true`를 돌려준다.
- 실행: `service/support/MusicBoxSettler`. 쓰기는 `lockAndSettle(now)`(잠금 → 정리) 뒤 변경하고 `touch()`, 조회는 `settleIfDue(now)`를 부른다.
  - `MANDATORY`라 항상 호출한 서비스의 트랜잭션에서 일어난다. 읽기 전용 트랜잭션에 쓰기가 섞여 저장되지 않는 문제가 없다.
  - `touch()`는 트랜잭션마다 한 번만 부른다. 정리와 변경이 한 요청에서 같이 일어나도 `revision`은 1만 오른다.
  - 쓰기는 바꾼 게 없어도 `touch()`한다. `lockAndSettle`은 잠근 상태 행만 돌려준다 (가정 R1).

S4 정상
- Given 재생곡 `20`(`startedAt=12:00:00`, `durationSeconds=200`)이 있다.
- Given 대기열은 `[21(100초), 22(길이 모름)]`이다.
- When 12:04:00으로 `SongSettlement.settle`을 부른다.
- Then `true`를 돌려준다.
- Then `20`은 `played`이고 `playedAt=12:03:21`이다.
- Then `21`은 `playing`이고 `startedAt=12:03:21`이다.
- Then `22`는 `queued` 그대로다.

S5 여러 곡 경과
- Given S4와 같다.
- When 12:10:00으로 `settle`을 부른다.
- Then `20`, `21`이 `played`이고 `22`가 `playing`이다.
- Then `22`의 `startedAt=12:10:00`이다 (길이를 모르는 곡은 정리한 시각부터 시작).

S6 길이 모름
- Given 재생곡의 `durationSeconds=null`이다.
- When 1시간 뒤 시각으로 `settle`을 부른다.
- Then `false`를 돌려주고 곡은 `playing` 그대로다.

S7 정리할 곡 없음 (공개 조회)
- Given 재생곡이 아직 끝나지 않았다.
- When 공개 `SongsService`로 현재 곡을 조회한다.
- Then `findForUpdate`를 호출하지 않고, `revision`은 그대로다.

S7b 정리가 필요한 공개 조회
- Given S4와 같고 `revision=5`다.
- When 12:04:00에 공개 `SongsService`로 현재 곡을 조회한다.
- Then `findForUpdate`를 한 번 호출한다.
- Then 응답의 현재 곡은 `21`이고 `revision=6`이다 (정확히 1 증가).

## 3. 신청곡 접수 (R3)

로그인 회원은 곡명·가수·사연을 보내 신청곡을 `pending`으로 접수한다. (WBS 11.1)

고객 쓰기(접수·삭제)는 "`findForUpdate` 잠금 → `settle` → 변경 → `touch()`" 순서로 처리한다.

S8 정상
- Given 현재 회원이 `id=7`, `displayName=민지`다.
- When `POST /api/v1/musicbox/songs`에 `{"songTitle":" 밤편지 ","artist":"아이유","story":"오늘 첫 출근했어요"}`를 보낸다.
- Then `201`을 반환한다.
- Then 응답은 `songTitle=밤편지`, `requesterName=민지`, `status=pending`이다.
- Then `revision`이 정확히 1 오른다.

S9 입력 오류
- Given `songTitle`이 공백뿐이거나 101자다.
- Then `400`과 `{code, message}`를 반환하고 저장하지 않는다.

S10 사연 최대 길이
- Given `story`가 500자다.
- Then `201`을 반환하고 응답의 `story`가 500자 그대로다.

S11 비로그인
- Given 현재 회원이 없다.
- Then `401`을 반환하고 저장하지 않는다.

## 4. 내 신청곡 목록 (R4)

회원은 자기 신청곡만 상태와 함께 본다. (WBS 11.4)

S12 정상
- Given 회원 7의 곡이 3개(`pending`, `played`, `cancelled`), 회원 8의 곡이 1개 있다.
- When 회원 7이 `GET /api/v1/my/songs`를 호출한다.
- Then 회원 7의 곡 3개만 `createdAt` 내림차순으로 반환한다.

S13 없음
- Given 회원 9의 곡이 0개다.
- Then `200`과 `[]`를 반환한다.

## 5. 내 신청곡 삭제 (R5)

회원은 재생 중이 아닌 자기 신청곡을 삭제한다. (WBS 11.5)

S14 정상
- Given 회원 7의 곡 `10`이 `queued`다.
- When `DELETE /api/v1/my/songs/10`을 호출한다.
- Then `204`를 반환하고 목록에 `10`이 없다.
- Then `revision`이 정확히 1 오른다.

S15 남의 곡
- Given 곡 `11`이 회원 8의 곡이다.
- When 회원 7이 삭제한다.
- Then `404`를 반환하고 곡은 남아 있다.

S16 재생 중
- Given 회원 7의 곡 `12`가 `playing`이다.
- Then `409`와 "재생 중인 신청곡은 삭제할 수 없습니다."를 반환한다.

S16b 시간이 지난 재생곡 삭제 (R2·R5)
- Given 회원 7의 곡 `12`가 `playing`이지만 `endsAt`이 이미 지났다.
- When `DELETE /api/v1/my/songs/12`를 호출한다.
- Then 정리로 `played`가 된 뒤 삭제되어 `204`를 반환한다.

## 6. 신청곡 공개 목록 (R6)

방문자는 대기열·접수함·최근 지난 선곡 20곡을 본다. (WBS 11.2)

S17 정상
- Given 다음 곡들이 있다.
  - `queued` 곡 2개 (`playlistOrder` 2, 1)
  - `pending` 곡 2개
  - `played` 곡 1개
  - `cancelled` 곡 1개
- When 로그인 없이 `GET /api/v1/musicbox/songs`를 호출한다.
- Then `200`을 반환한다.
- Then `playlist`는 순서 1, 2로 정렬돼 있다.
- Then `inbox`는 `createdAt` 오름차순 2개다.
- Then `played`는 `playedAt` 내림차순 1개다.
- Then `cancelled` 곡은 없다.

S17b 지난 선곡 개수 제한
- Given `played` 곡이 25개다.
- When 공개 목록을 조회한다.
- Then `played`는 `playedAt`이 최근인 20개만 들어 있다.

S18 시간 경과 반영 (R2·R6)
- Given S4와 같다.
- When 12:04:00에 목록을 조회한다.
- Then `playlist=[22]`이고 `played`에 `20`이 있다.

## 7. 현재 곡 (R7)

방문자는 현재 곡과 재생 위치 계산에 필요한 값, 변경 확인용 `revision`을 본다. (WBS 11.3)

S19 정상
- Given S4와 같다.
- When 12:01:00에 `GET /api/v1/musicbox/songs/now`를 호출한다.
- Then `current.id=20`, `startedAt=12:00:00`, `durationSeconds=200`이다.
- Then `endsAt=12:03:21`, `serverNow=12:01:00`, `revision=5`다.

S20 재생 중인 곡 없음
- Given `playing`인 곡이 없다.
- Then `current=null`이고 `revision`과 `serverNow`는 들어 있다.

S21 변경 감지 (R3·R7)
- Given `revision=5`다.
- When 신청곡을 하나 접수한 뒤 현재 곡을 조회한다.
- Then `revision=6`이다.

## API 계약

| 요구사항 | 경로 | Controller | 권한 | 성공 응답 |
| --- | --- | --- | --- | --- |
| R3 | `POST /api/v1/musicbox/songs` | `SongsController` | 고객 | `201`, 신청곡 |
| R4 | `GET /api/v1/my/songs` | `my/SongsController` | 고객 | `200`, 신청곡 배열 |
| R5 | `DELETE /api/v1/my/songs/{id}` | `my/SongsController` | 고객 | `204` |
| R6 | `GET /api/v1/musicbox/songs` | `SongsController` | 누구나 | `200`, `{playlist, inbox, played}` |
| R7 | `GET /api/v1/musicbox/songs/now` | `SongsController` | 누구나 | `200`, `{current, serverNow, revision}` |

- 현재 곡 경로는 처음 `GET /api/v1/songs/now`였다. 공개 API를 `/api/v1/musicbox/songs` 아래에 모으려고 옮겼다 (고침 10-27).
- 신청곡 응답 필드:
  - 기본: `id`, `requesterName`, `songTitle`, `artist`, `story`, `status`
  - 재생 정보: `youtubeVideoId`, `playlistOrder`, `durationSeconds`
  - 시각: `createdAt`, `startedAt`, `playedAt`, `updatedAt`
  - `userId`는 공개 응답에 넣지 않는다.
  - `playlistOrder`는 `queued`인 곡만 값이 있고 나머지는 `null`이다.
- 현재 곡 `current`: 신청곡 필드에 `endsAt`을 더한다.
- 오류는 공통 `{code, message}` 형식이다.
  - 입력 오류 `400`
  - 비로그인 `401`
  - 관리자 계정으로 고객 전용 요청 `403`
  - 없음·남의 곡 `404`
  - 재생 중 삭제 `409`
- 프론트는 지금 `GET /api/music-box/version`의 문자열 버전을 몇 초마다 확인한다. 연결할 때 `GET /api/v1/musicbox/songs/now`의 `revision`으로 바꾼다 (프론트 계획).
- `SecurityConfig`에 위 권한을 선언했다 (10-27). 누구나는 `permitAll`, 고객은 `hasRole("CUSTOMER")`이다. 등록하지 않은 경로는 `denyAll`이다.
  - 쓰기 요청(`POST`·`DELETE`)은 CSRF 토큰이 필요하다. 장바구니와 같다.

## 병렬 작업 대응

### 관리자 신청곡 (cha, PR #78)

- 10-26 PR 코멘트로 공용 파일을 DB 설계대로 맞추자고 요청했고, cha가 `93fbfe5`에 반영했다.
- 10-26부터 추가 조율은 하지 않는다. 이 PR이 구조를 맞추는 데 필요한 공용 코드 수정은 직접 하고, 시점은 충돌을 줄이는 쪽으로 나눈다.

| 항목 | PR #78 (`93fbfe5`) | 이 PR의 처리 | 단계 |
| --- | --- | --- | --- |
| 상태 enum, 전이 메서드, `userId`, `updatedAt`, 컬럼 길이, `revision`·`touch()`, 영상 길이, `INVALID_INPUT`, Bean 이름 | 반영됨 | 그대로 쓴다 | - |
| `play()`·`finish()` 시각 | `Instant.now()`만 씀 | `play(Instant at)`, `finish(Instant at)`를 더하고 기존 메서드는 위임 | 3 |
| 재생·종료 후 `playlistOrder` | 남음 | 위 메서드에서 `null`로 정리 | 3 |
| `music_box_state` `id=1` 행 | 만드는 코드 없음 | `MusicBoxStateInitializer` (있으면 건너뜀) | 3 |
| 관리자 조작의 시간 경과 정리 | 없음 | `admin/SongsService`의 각 조작에서 `MusicBoxSettler.lockAndSettle`, 목록 조회는 `settleIfDue` | 6 |
| 시각 컬럼 | `startedAt`, `playedAt`, `MusicBoxState.updatedAt`에 `TIMESTAMPTZ` 없음 | 지정 | 3 |
| `requesterName` 길이 | 40자 | 50자 (#61 `UserFields.NAME_MAX_LENGTH`) | 3 |
| enum 상수 이름 | 소문자 상수 | 그대로 둔다. 저장 값은 DB 설계와 같고, 바꾸면 PR #78 전체를 고쳐야 한다 | - |

단계 3은 PR #78의 `Song.java`·`MusicBoxState.java`에서 메서드를 더하고 몇 줄(`play()`·`finish()` 본문, 컬럼 정의)을 고친다. PR #78이 같은 줄을 또 고치면 rebase 충돌이 나고, 그때 abort하고 보고한다. 단계 6은 PR #78이 develop에 머지된 뒤 develop 코드를 고친다.

진행 순서:

1. 이 브랜치를 PR #78 위에서 작업한다 (단계 2 완료, `93fbfe5`).
2. PR #78에 새 커밋이 올라오면 `git rebase origin/feature/admin-songs-playback`을 실행한다. 충돌이 나면 abort하고 보고한다.
3. PR #78이 squash 머지되면 `git rebase --onto origin/develop origin/feature/admin-songs-playback`을 실행하고 PR base를 `develop`으로 바꾼다.
4. 단계 6은 PR #78이 바뀌지 않아 머지 전에 이 브랜치에서 진행했다 (10-26).

### 충돌 지점: `ApiExceptionHandler`

cha, #69, 이 PR이 모두 핸들러를 추가한다.

- `SongException`과 그 핸들러는 PR #78의 것을 쓴다. `INVALID_INPUT`은 cha가 추가한다 (10-26 합의).
- `AuthenticationRequiredException`의 401 핸들러는 #69와 내용을 똑같이 맞춘다.
  - 두 PR이 모두 머지되면 git은 충돌 없이 합쳐도, 같은 예외 핸들러가 2개가 돼 Spring이 시작하지 못한다.
  - rebase 뒤 `./gradlew test`의 MockMvc 테스트로 확인하고, 중복이면 하나를 지운다.
- 이 PR이 추가하는 핸들러는 클래스 맨 끝에 둬서 다른 PR과 겹치는 줄을 줄인다.

### 인증·회원 (#61, #66, #67, #69)

| PR | 현재 회원 처리 | 이 계획의 대응 |
| --- | --- | --- |
| #61 `session-auth` (머지됨) | `@AuthenticationPrincipal SessionUserDetails` | Q1 구현체 추가와 `SecurityConfig` 권한 선언 완료 (10-27) |
| #66 `admin-user-api` | `User` 엔티티만 따로 만듦 | `user_id`는 FK 없이 `Long`. `User`가 develop에 들어오면 FK 추가 (10-27 완료: `Song.user` `@ManyToOne`) |
| #67 `my-be` | 고정 회원 ID (`CurrentUser`) | 쓰지 않는다. 누가 호출해도 같은 회원이 된다. |
| #69 `order-api` | `CurrentUserContext`, 없으면 `401` | Q1 A: 같은 파일을 쓴다 |

## 범위 밖

- 관리자 선곡·재생 API (WBS 10.x). cha가 담당한다.
- 공용 엔티티·Repository·`SongException` (R1). PR #78이 담당한다.
- 홈 신청곡 요약 `GET /api/v1/index/songs`. 청사진의 `HomeController` 작업에서 다룬다.
- `user_id` FK. 별도 작업으로 한다. (고침 10-27: `feature/songs-user-fk`에서 연결했다)
- `playing`·`queued` DB 인덱스와 PostgreSQL 통합 테스트 (Q3, S3).
- 손님 화면의 재생 종료·영상 길이 통지 (Q2). 서버 판단에 필요한 길이는 관리자 쪽에서 확보한다.
- 프론트 연결과 YouTube Data API 호출. [YouTube 정리](./youtube-data-api.md)는 팀 공용 참고 문서다.
- 반복 모드 (청사진 Q3 보류).

## 작업 순서

1. 계획 문서 저장 — 전체
   - 파일: 이 문서, `docs/musicbox/youtube-data-api.md`
   - 커밋: `docs: 고객 신청곡 백엔드 계획 추가`
2. PR #78 위로 옮기기 — S1, S2 확인 (약 30분)
   - 전제: PR #78에 공용 파일 수정 커밋이 올라왔다.
   - 명령: `git rebase --onto origin/feature/admin-songs-playback origin/develop`
   - 「병렬 작업 대응」 표를 코드와 대조한다. 다르면 PR #78에 코멘트한다.
   - 확인: `cd backend && ./gradlew test`
3. 엔티티 보완·상태 행·정리 규칙 — S1, S1b, S2, S2b, S4~S6 (약 2.5시간)
   - 파일: `entity/song/Song`(`play(Instant)`, `finish(Instant)`, 시각 컬럼, `requesterName` 50자), `entity/song/MusicBoxState`(`updatedAt` 컬럼), `config/MusicBoxStateInitializer`, `entity/song/SongSettlement`
   - S1은 `PluralTableNamingStrategyTest` 방식의 Hibernate 메타데이터 테스트로 확인한다.
   - `SongSettlement`는 시각을 인자로 받으므로 `Clock`이 필요 없다. 서비스가 `Clock`(`config`의 `Clock.systemUTC()` Bean)으로 현재 시각을 정해 넘긴다 (단계 4·5).
   - 확인: `./gradlew test --tests '*SongSettlement*' --tests '*Song*' --tests '*MusicBoxState*'`
4. 회원 신청곡 — S8~S16b (약 2.5시간)
   - `SongRepository`에 필요한 조회 메서드(내 곡 목록, 내 곡 하나)는 인터페이스 맨 끝에 덧붙인다.
   - 파일: `common/security/AuthenticatedUser`·`CurrentUserContext`·`CurrentUserConfiguration`·`AuthenticationRequiredException`, `ApiExceptionHandler` 401 핸들러 (#69와 같은 내용), `controller/my/SongsController`(`mySongsController`), `service/my/SongsService`(`mySongsService`), `dto/songs/CreateSongRequest`·`SongResponse`
   - 확인: `./gradlew test --tests '*my.Songs*'`
5. 공개 목록·현재 곡 — S7, S7b, S17, S17b, S18~S21 (약 2시간)
   - 최근 지난 선곡 20곡 조회 메서드도 `SongRepository` 맨 끝에 덧붙인다.
   - 파일: `controller/SongsController`, `service/SongsService` (Bean 이름은 기본값 `songsController`·`songsService`), `dto/songs/MusicBoxSongsResponse`·`NowPlayingResponse`
   - 확인: `./gradlew test` 전체 통과
   - PR 생성 (base: `feature/admin-songs-playback`)
6. 관리자 조작 연결 (약 1.5시간)
   - 파일: `service/support/MusicBoxSettler`(공개·회원 서비스의 정리 코드를 옮김), `service/admin/SongsService`(조작마다 `lockAndSettle`, `list()`는 `settleIfDue`, `Clock` 주입)
   - 확인: `./gradlew test` 전체 통과, 기존 `SongsServiceTest`도 통과

- 각 S는 테스트 하나와 1:1로 맞춘다. Controller는 MockMvc, Service는 Mockito 단위 테스트로 한다 (카테고리·메뉴와 같은 구조).
- S3는 PostgreSQL 검증으로 남긴다.

## 브랜치·커밋

- 브랜치: `feature/customer-songs-api`. 단계 2에서 `origin/feature/admin-songs-playback` 위로 옮긴다.
- 커밋: 단계 1, 4, 5, 6은 각각 한 커밋, 단계 3은 엔티티 보완과 정리 로직을 두 커밋으로 나눈다. 단계 2는 커밋이 없다.
  - 예: `fix: 신청곡 엔티티 시각 기록과 컬럼 정의 보완`
  - 예: `feat: 신청곡 시간 경과 정리 규칙 추가`
  - 예: `fix: 관리자 선곡 조작에 시간 경과 정리 연결`
  - 예: `feat: 회원 신청곡 접수·조회·삭제 API 추가`
- PR:
  - PR #78이 머지되기 전에는 base를 `feature/admin-songs-playback`으로 연다. 이 PR의 변경만 보이게 하기 위해서다 (#67과 같은 방식).
  - PR #78이 머지되면 develop 위로 rebase하고 base를 `develop`으로 바꾼다.
  - 머지는 사람이 한다.

## 가정

- R1: `endsAt = startedAt + durationSeconds + 1초`다.
- R1: 상태 값은 DB 설계대로 소문자(`pending` 등)로 저장한다.
- R1: `revision`은 쓰기 요청과, 정리로 상태가 바뀐 조회에서 `MusicBoxState.touch(now)`로 1 올린다. `touch()`는 트랜잭션마다 한 번만 부른다.
  - 바꿀 게 없는 관리자 종료·취소 요청(화면이 늦게 보낸 요청)도 올린다. 손님 화면이 한 번 더 받아오는 비용으로 `lockAndSettle`이 정리 여부를 돌려주지 않아도 되게 했다 (10-27 결정).
- R2: 다음 곡은 앞 곡의 `endsAt`부터 시작한 것으로 친다. 다음 곡의 길이를 모르면 정리한 시각부터 시작한다 (목 저장소 `settle`과 같음).
- R2: 공개 조회는 먼저 잠금 없이 확인하고, 끝난 곡이 있을 때만 `findForUpdate`로 잠근 뒤 다시 조회해 정리한다.
  - 공개 조회 메서드는 `@Transactional(readOnly = true)`를 쓰지 않는다. 같은 트랜잭션에서 정리 쓰기가 일어날 수 있기 때문이다. 같은 클래스 안의 다른 `@Transactional` 메서드를 부르는 방식은 프록시를 거치지 않아 트랜잭션 설정이 무시되므로 쓰지 않는다.
  - 잠금 전 확인은 엔티티가 아니라 값(`startedAt`, `durationSeconds`)만 조회한다. 엔티티로 읽으면 잠금 뒤 다시 조회해도 영속성 컨텍스트에 남은 옛 객체가 돌아온다.
  - 열려 있는 모든 화면이 몇 초마다 조회하기 때문이다.
  - 이 잠금 방식은 뮤직박스 전용 선택이다 (구현 기준 5).
- R2: 길이를 모르는 곡은 관리자가 다음 곡으로 넘기거나 취소할 때까지 `playing`이다.
- R3: 곡명 1~100자, 가수 1~80자, 사연 1~500자이고 앞뒤 공백을 제거한다. 프론트 `RequestForm.tsx`·`_actions.ts`와 같다.
- R3: `requesterName`은 신청 당시 회원 이름이다. 회원 이름이 바뀌어도 그대로 둔다.
- R3: `user_id`는 `User` 엔티티가 develop에 없으므로 FK 없는 `Long NOT NULL`로 둔다. (고침 10-27: `Song.user`를 `@ManyToOne(LAZY)`로 바꿔 `users` FK를 건다. 실제 DB에 회원이 없는 `user_id` 행이 있으면 `ddl-auto: update`의 제약 생성이 WARN만 남기고 실패해 FK가 빠진 채로 뜬다. 전용 DB에서 재현했다. 배포 전에 고아 행 수가 0인지 확인한다)
- R4: 상태별 정렬(재생 중 → 대기 → 접수 …)은 프론트가 한다.
- R5: 남의 곡과 없는 곡은 구분하지 않고 `404`를 반환한다. 삭제는 DB 설계대로 행을 지운다.
- R6: 공개 응답에 신청자 이름과 사연을 넣는다. 지금 공개 화면에 이미 보이는 정보다.
- R6: 지난 선곡은 `playedAt` 최근 20곡만 반환한다. 공개 화면은 최근 기록이면 충분하고, 응답이 계속 커지는 것을 막는다. 전체 기록이 필요하면 페이지 API를 따로 만든다 (10-26 답변).
- 예외는 `MenuException`·`CategoryException`을 재사용하지 않고 `SongException`을 따로 둔다 (구현 기준 3).

## 참고

- 백엔드 청사진 (2026-10-25 확인):
  - 공개 곡 목록·현재 곡은 `SongsController`, 곡 신청·내 곡은 `my/SongsController`가 담당하고 DTO는 `dto/songs/`에 둔다. 곡 신청은 10-26에 `SongsController`로 옮겼다 (「구현 결과」).
  - WBS 경로: `GET /api/v1/musicbox/songs`, `GET /api/v1/musicbox/songs/now`, `POST /api/v1/musicbox/songs`, `GET /api/v1/my/songs`, `DELETE /api/v1/my/songs/{id}`
  - 같은 클래스명은 Bean 이름으로 구별한다.
  - 부분 인덱스는 `ddl-auto`로 생성된다고 가정하지 않는다. 별도 `sql/` 폴더나 마이그레이션 도구는 쓰지 않는다.
- DB 설계 뮤직박스 절과 4절: 상태 5종, `playing` 최대 1건, `revision`, 단일 행 잠금 (2026-10-25 확인)
- 카테고리 계획: 구현 기준 1~8. `is_fallback` 부분 인덱스 적용 방법이 아직 결정 필요 상태다 (2026-10-25 확인).
- 메뉴 계획: `MenuFields`, Bean 이름, 단계별 커밋 형식 (2026-10-25 확인)
- develop에는 PostgreSQL 통합 테스트가 없다. 테스트는 Mockito·MockMvc·Hibernate 메타데이터(`PluralTableNamingStrategyTest`) 중심이다 (2026-10-25 확인).
- `PluralTableNamingStrategy`에 `Song`→`music_requests`, `MusicBoxState`→`music_box_state` 매핑이 이미 있다 (고침 10-27: `Song` 예외를 지워 기본 규칙대로 `songs`가 된다) (2026-10-25 확인).
- 프론트 목 저장소 `frontend/app/_lib/mock/music-box.ts`: `END_GRACE_MS=1000`, `settle` (2026-10-25 확인)
- 프론트 영상 길이 출처 (2026-10-25 확인):
  - 관리자가 플레이리스트에 담을 때 미리보기가 잰 길이를 보낸다 (`AddToPlaylistForm.tsx`).
  - 재생 화면의 `reportDuration`·`finishPlaying`은 길이를 모를 때 쓰는 보조 수단이다 (`YouTubePlayer.tsx`, `DjBooth.tsx`, `OnAirPlayer.tsx`).
- 열린 PR #61·#66·#67·#69의 현재 회원 처리 방식 (2026-10-25 확인). #61 본문에 "develop에 병합하지 않는다"고 적혀 있다.
- PR #78 (`bfa9a98`)과 cha 계획 문서 `docs/admin/songs/2026-10-26-backend-songs-playback.md` (2026-10-26 확인):
  - 처음에는 `revision`, 자동 정리, `user_id`, 영상 길이를 "결정 필요"나 "범위 밖"으로 두었다.
  - 10-26 PR 코멘트 요청에 cha가 전부 반영하겠다고 답했다. 시간 경과 정리는 고객 쪽 것을 쓰기로 했다 (이후 `SongSettlement`로 구조 변경).
  - `music_box_state` `id=1` 행을 만드는 코드가 없다. 이 PR 단계 3에서 만든다.
- PR #78 `93fbfe5` (2026-10-26 확인): 합의한 공용 파일 수정이 반영됐다. `play()`·`finish()`는 `Instant.now()`, `requesterName`은 40자, `startedAt`·`playedAt`에 `TIMESTAMPTZ`가 없고 `id=1` 행 생성 코드가 없다. 테스트 55개 통과.
- #61 `UserFields.NAME_MAX_LENGTH = 50` (2026-10-26 확인).
- #69의 인증 파일은 4개이고, `ApiExceptionHandler`에 401 핸들러(`UNAUTHENTICATED`)를 추가한다 (2026-10-26 확인).
- 프론트 지난 선곡: `/musicbox`는 전부 이어 붙여 화면에서 페이지를 나누고, `/admin/songs`는 최근 10곡만 보여 준다 (2026-10-26 확인).
