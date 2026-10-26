# 관리자 선곡·재생 백엔드 계획

## 한눈에

- 끝나면: 관리자가 접수된 신청곡에 YouTube 영상을 붙여 플레이리스트에 담고, 순서를 바꾸고, 바로 재생하고, 재생 종료·취소를 처리할 수 있다. 재생 중인 곡은 항상 한 건으로 유지된다.
- 현재: `Song`/`MusicBoxState` Entity, Repository, `SongsService`, `SongsController`, 예외 처리, 단위·MockMvc 테스트까지 구현했다. 관리자 인증, `user_id` 연결, `revision` 동시성 필드, 영상 길이 기록 API, 실제 PostgreSQL 검증은 남아 있다.
- 결정 필요: 동시성 제어를 지금처럼 `MusicBoxState` 행 잠금(`PESSIMISTIC_WRITE`)만으로 할지, DB 설계 문서가 요구하는 `revision` 필드까지 추가할지 정한다.
- 위치: 이 파일은 `docs/admin/songs/`의 백엔드 계획이다. 프론트엔드 계획은 같은 폴더에 별도 파일로 작성한다.

## 구현 현황 (2026-10-26)

| 영역 | 현재 상태 | 남은 확인 |
| --- | --- | --- |
| 접수곡 조회·취소 | Controller → Service → Repository, 단위·MockMvc 테스트 통과 | 실제 PostgreSQL에서 S-조회·S-취소 검증 |
| 플레이리스트 담기·수정·순서 변경 | 구현·테스트 통과 | `queued` 순서 유일 제약을 DB 레벨에서 검증 |
| 바로 재생·재생 종료·재생 취소 | `MusicBoxState` 단일 행 잠금으로 동시 재생 1건 보장 | `revision` 필드 추가 여부 결정, 실제 동시 요청 테스트 |
| 영상 길이(`durationSeconds`) 기록 | 미구현 — 현재 아무 코드도 값을 채우지 않음 | 플레이리스트에 담을 때 선택값으로 받을지, 재생 시작 후 별도 API로 기록할지 결정 |
| `user_id` 연결 | 미구현 — `Song`에 FK 없음, `requesterName` 텍스트만 있음 | 인증 구현 후 신청곡-회원 연결 여부와 시점 결정 |
| 관리자 접근 제어 | 미구현(TODO 주석만 남김) | `feature/session-auth-*` 머지 후 권한 체크 추가 |
| 만료곡 자동 정리 | 미구현 — 관리자가 명시적으로 `current/finish`를 호출해야만 종료 처리됨 | `started_at + durationSeconds` 기준 자동 정리가 필요한지 결정 |
| 프론트엔드 연결 | 목 저장소(`frontend/app/_lib/mock/music-box.ts`) 사용 중 | API 연결 시 `returnToInbox`/`moveToPlayed`에 대응하는 엔드포인트 필요 여부 재확인 |

현재 `./gradlew test`는 통과하지만 PostgreSQL을 띄우는 통합 테스트는 없다. 신청곡 API에 아직 관리자 인증이 적용되지 않았으므로 접근 제어가 완료된 것으로 취급하지 않는다.

## 1. 접수곡 조회와 취소 (R1)

관리자는 모든 상태의 신청곡을 조회하고, `pending` 상태인 곡의 접수를 취소할 수 있다.

S1 목록 조회
- Given 상태가 각각 다른 신청곡 여러 건이 있다.
- When 관리자가 `GET /api/v1/admin/songs`를 호출한다.
- Then 전체 신청곡을 반환한다.

S2 접수 취소
- Given `id=5`인 신청곡이 `pending` 상태다.
- When 관리자가 `PUT /api/v1/admin/songs/5/cancel`을 호출한다.
- Then 상태가 `cancelled`로 바뀌고 삭제되지 않는다.

S3 상태 오류
- Given `id=5`인 신청곡이 `queued` 상태다.
- When 관리자가 `PUT /api/v1/admin/songs/5/cancel`을 호출한다.
- Then `409`를 반환하고 상태는 바뀌지 않는다.

S4 누락
- Given `id=999`인 신청곡이 없다.
- When 관리자가 `PUT /api/v1/admin/songs/999/cancel`을 호출한다.
- Then `404`를 반환한다.

## 2. 플레이리스트에 담기와 수정 (R2)

관리자는 `pending` 상태 신청곡에 YouTube 영상 id를 붙여 플레이리스트에 담고, `queued` 상태인 동안 영상 id를 수정할 수 있다.

S5 담기
- Given `id=5`인 신청곡이 `pending` 상태다.
- When 관리자가 `POST /api/v1/admin/songs/playlist`에 `{"songId":5,"youtubeVideoId":"abc123"}`를 보낸다.
- Then `200`과 `status=queued`, `youtubeVideoId=abc123`인 응답을 반환하고, 재생 중인 곡이 없었다면 즉시 `playing`으로 전환된다.

S6 상태 오류
- Given `id=5`인 신청곡이 `played` 상태다.
- When 관리자가 같은 요청을 보낸다.
- Then `409`를 반환한다.

S7 수정
- Given `id=5`인 신청곡이 `queued` 상태로 영상 id `abc123`을 가지고 있다.
- When 관리자가 `PUT /api/v1/admin/songs/playlist/5`에 `{"songId":5,"youtubeVideoId":"xyz789"}`를 보낸다.
- Then `200`과 `youtubeVideoId=xyz789`인 응답을 반환한다.

## 3. 플레이리스트 순서 변경 (R3)

관리자는 `queued` 상태 곡의 순서를 한 칸씩 위/아래로 바꿀 수 있다.

S8 정상
- Given `queued` 순서가 `[5, 7, 9]`다.
- When 관리자가 `PUT /api/v1/admin/songs/playlist/7/order`에 `{"direction":"up"}`을 보낸다.
- Then `7`과 `5`의 순서가 뒤바뀐다.

S9 경계
- Given `queued` 순서가 `[5, 7, 9]`다.
- When 관리자가 맨 앞 곡(`5`)에 `direction=up` 또는 맨 뒤 곡(`9`)에 `direction=down`을 보낸다.
- Then `409`를 반환하고 순서는 바뀌지 않는다.

## 4. 바로 재생 (R4)

관리자는 `queued` 상태 곡을 즉시 재생으로 전환할 수 있고, 이미 재생 중인 곡이 있으면 플레이리스트로 되돌린다.

S10 정상
- Given 재생 중인 곡이 없고 `id=7`인 곡이 `queued` 상태다.
- When 관리자가 `POST /api/v1/admin/songs/playlist/7/play`를 호출한다.
- Then `id=7`의 상태가 `playing`으로 바뀌고 `startedAt`이 기록된다.

S11 교체
- Given `id=5`가 `playing` 중이고 `id=7`이 `queued` 상태다.
- When 관리자가 `POST /api/v1/admin/songs/playlist/7/play`를 호출한다.
- Then `id=5`는 `queued`로 되돌아가고 `id=7`이 `playing`으로 바뀐다.

S12 동시 요청
- Given 재생 중인 곡이 없고 `id=5`, `id=7`이 모두 `queued` 상태다.
- When 두 관리자가 거의 동시에 각각 `id=5`, `id=7`에 바로 재생을 요청한다.
- Then `MusicBoxState` 행 잠금으로 두 요청이 직렬화되어, 먼저 처리된 쪽이 `playing`이 되고 나중 요청은 그 상태를 반영해 기존 재생곡을 `queued`로 되돌린 뒤 자신을 `playing`으로 바꾼다. 최종적으로 `playing`은 한 건만 남는다.

## 5. 재생 종료와 재생 취소 (R5)

재생 중인 곡은 정상 종료되거나(`played`), 취소되어 다시 대기 상태(`pending`)로 돌아갈 수 있다.

S13 종료
- Given `id=7`이 `playing` 중이다.
- When 관리자가 `POST /api/v1/admin/songs/current/finish`에 `{"id":7}`을 보낸다.
- Then `id=7`은 `played`가 되고 `playedAt`이 기록되며, 대기열에 다음 곡이 있으면 자동으로 `playing`이 된다.

S14 취소
- Given `id=7`이 `playing` 중이다.
- When 관리자가 `POST /api/v1/admin/songs/current/cancel`에 `{"id":7}`을 보낸다.
- Then `id=7`은 `pending`으로 돌아가고 `playlistOrder`·`startedAt`이 초기화된다.

S15 불일치 무시
- Given `id=5`가 `playing` 중이다.
- When 관리자가 `{"id":7}`(현재 재생 곡과 다른 id)로 종료·취소를 요청한다.
- Then 아무 상태도 바뀌지 않고 조용히 무시한다.

## API 계약

| 관련 요구사항 | 경로 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| R1 | `GET /api/v1/admin/songs` | 없음 | `200`, 신청곡 배열 |
| R1 | `PUT /api/v1/admin/songs/{id}/cancel` | 없음 | `200` |
| R2 | `POST /api/v1/admin/songs/playlist` | `songId`, `youtubeVideoId` | `200`, 신청곡 |
| R2 | `PUT /api/v1/admin/songs/playlist/{id}` | `songId`, `youtubeVideoId` | `200`, 신청곡 |
| R3 | `PUT /api/v1/admin/songs/playlist/{id}/order` | `direction: "up"\|"down"` | `200` |
| R4 | `POST /api/v1/admin/songs/playlist/{id}/play` | 없음 | `200` |
| R5 | `POST /api/v1/admin/songs/current/finish` | `id` | `200` |
| R5 | `POST /api/v1/admin/songs/current/cancel` | `id` | `200` |

응답 필드는 `id`, `requesterName`, `songTitle`, `artist`, `story`, `status`, `youtubeVideoId`, `playlistOrder`, `createdAt`, `playedAt`, `startedAt`, `durationSeconds`다. 오류는 공통 형식 `{code, message}`로 반환하며, 현재 `NOT_FOUND`는 `404`, `CONFLICT`는 `409`다.

## 다른 기능 개발에 적용할 구현 기준

1. **계층별 역할:** Controller는 HTTP 요청·DTO 검증, Service는 트랜잭션·상태 전이·동시성 제어, Entity는 자신의 필드 변경만 담당한다. Controller가 Repository를 직접 호출하거나 Entity를 응답으로 반환하지 않는다 (`SongResponse.from()`으로 변환).
2. **상태 전이:** `pending → queued → playing → played`와 `cancelled`만 허용한다. 각 전이 전에 Service가 현재 상태를 확인하고, 허용되지 않은 전이는 `SongException(CONFLICT)`로 거절한다.
3. **단일 재생 보장:** `MusicBoxState`를 `id=1`로 고정한 단일 행으로 두고, 재생 시작·종료·취소 전에 `@Lock(PESSIMISTIC_WRITE)`로 그 행을 잠가 동시 요청을 직렬화한다. 재생 중인 곡이 최대 한 건이라는 불변식은 이 잠금으로 보장한다.
4. **공통 오류:** Service의 업무 충돌은 `SongException`으로 표현하고 `ApiExceptionHandler`에서 HTTP 상태로 변환한다. 기존 `CategoryException` 패턴을 그대로 재사용하지 않고 도메인별 예외를 따로 둔다.
5. **청사진 밖 기능 보류:** 프론트 목 데이터에 있는 `returnToInbox`, `moveToPlayed` 같은, 백엔드 청사진 8개 엔드포인트에 없는 동작은 Service 메서드로만 구현해두고 Controller에 연결하지 않는다. 팀 확인 후 필요하면 엔드포인트를 추가한다.

## 범위 밖

- 관리자 인증·권한 체크 (`feature/session-auth-*` 머지 후 진행).
- `Song`과 회원(`user_id`)의 실제 연결. DB 설계 문서는 FK를 필수로 명시하지만, 인증이 없는 현재 단계에서는 `requesterName` 텍스트만 저장한다.
- `MusicBoxState`의 `revision` 필드와 화면 버전 확인 API. 현재는 행 잠금만으로 동시성을 제어한다.
- 영상 길이(`durationSeconds`)를 YouTube API로 서버가 직접 조회하는 기능. 프론트엔드가 YouTube IFrame Player로 재생하면서 알아낸 길이를 서버에 전달하는 방식을 가정하며, 이 문서에는 그 기록 API를 포함하지 않는다(별도 작업으로 분리).
- `started_at + durationSeconds` 기준 만료곡 자동 정리. 현재는 관리자의 명시적인 `current/finish` 호출로만 종료 처리한다.

## 남은 작업 순서

1. [ ] 영상 길이 기록 경로 결정 및 구현
   - 플레이리스트에 담을 때 `durationSeconds`를 선택값으로 받을지, 재생 시작 후 별도 엔드포인트(`recordDuration` 등)로 기록할지 팀과 확인한다.
   - 확인: 결정 후 `SongsServiceTest`/`SongsControllerTest`에 케이스 추가.
2. [ ] DB 설계 문서와의 격차 해소
   - `Song.user_id`, `Song.updated_at`, `MusicBoxState.revision`, `MusicBoxState.updated_at` 추가 여부를 팀과 확인한다. 인증이 없는 현재 `user_id`는 nullable로 둘지, 인증 작업과 묶어서 처리할지 결정한다.
3. [ ] 관리자 접근 제어 연결 — `feature/session-auth-*` 머지 후
   - `SongsController` 위 TODO 주석을 실제 권한 체크로 교체한다.
4. [ ] 실제 PostgreSQL 검증
   - `queued` 순서 유일 제약, `playing` 단일 행 제약을 실제 DB에서 확인한다.

## 브랜치·커밋

- 브랜치: `feature/admin-songs-playback`.
- 계획 문서 커밋: `docs: 관리자 선곡·재생 백엔드 계획 추가`.
- 남은 검증·인증·프론트엔드 연결은 각각 논리적 변경 단위로 커밋한다. PR 대상은 `develop`이며 머지는 사람이 수행한다.

## 가정

- R1~R5: 신청곡 상태 머신은 `docs/FRONTEND.md`와 `backend/docs/2026-10-20-backend-blueprint.md`의 8개 엔드포인트를 그대로 따른다.
- R4: 동시 바로 재생 요청은 거부(에러)하지 않고, 잠금으로 순서를 보장해 둘 다 결국 일관된 최종 상태(가장 나중에 처리된 요청의 곡이 재생)에 도달한다.
- 영상 길이: 서버가 YouTube API를 직접 호출하지 않고, 프론트엔드가 재생 플레이어에서 얻은 값을 전달받아 저장하는 구조를 가정한다. 이 가정은 팀 확인 전까지 잠정적이다.
- `user_id`: 인증이 구현되기 전까지는 `requesterName` 텍스트만으로 신청곡을 식별하며, FK 연결은 인증 작업 이후로 미룬다.

## 참고

- 2026-10-26 확인: [DB 설계](../../database-design.md)는 `music_requests`/`music_box_state` 테이블에 `user_id`, `revision`, `updated_at`을 포함하도록 정하고 있어, 현재 구현과 격차가 있다.
- 2026-10-26 확인: [백엔드 청사진](../../../backend/docs/2026-10-20-backend-blueprint.md)은 관리자 선곡·재생 API 8개와 Controller → Service → Repository 구조를 정한다.
- 2026-10-26 확인: `frontend/app/_lib/mock/music-box.ts`는 `recordDuration`, `returnToInbox`, `moveToPlayed`처럼 백엔드 청사진에 없는 동작을 포함하고 있어, 팀 확인이 필요하다.
- 2026-10-26 확인: `backend/src/main/java`에 신청곡 API·Entity·Repository·공통 오류 처리가 있다. `./gradlew test`는 통과했으며 테스트는 MockMvc·Mockito 중심이다. PostgreSQL 통합 테스트와 관리자 인증 코드는 아직 없다.
