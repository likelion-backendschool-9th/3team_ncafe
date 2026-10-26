# 관리자 선곡·재생 프론트 연결 계획

## 한눈에

- 끝나면: `/admin/songs` 페이지가 목 저장소 대신 백엔드 관리자 선곡 API 8개를 호출한다. 관리자가 신청곡을 담고·재생하고·순서 변경하고·취소하면 실제 DB에 반영된다.
- 결정 필요: `returnToInbox`, `moveToPlayed`는 백엔드 엔드포인트가 없음 — 팀 확인 후 추가하거나 UI에서 제거.
- 규모: 6단계
- 현재 (10-26): 미착수. UI·컴포넌트·Server Actions 구조는 완성됐고 목 저장소만 교체하면 됨.
- 위치: `docs/admin/songs/`의 프론트 계획. 백엔드 계획은 같은 폴더의 `2026-10-26-backend-songs-playback.md`.

## 대상 쌍

| 페이지 | 주 컨트롤러 | 엔드포인트 (`/api/v1` 생략) |
| --- | --- | --- |
| `/admin/songs` | `SongsController`(관리자) | 아래 8개 전부 |

## 백엔드 API 계약

| 동작 | 메서드 | 경로 | 요청 바디 | 성공 |
| --- | --- | --- | --- | --- |
| 목록 조회 | `GET` | `/admin/songs` | — | `200`, 배열 |
| 접수 취소 | `PUT` | `/admin/songs/{id}/cancel` | — | `200` |
| 플레이리스트 담기 | `POST` | `/admin/songs/playlist` | `{songId, youtubeVideoId}` | `200`, 신청곡 |
| 영상 수정 | `PUT` | `/admin/songs/playlist/{id}` | `{songId, youtubeVideoId}` | `200`, 신청곡 |
| 순서 변경 | `PUT` | `/admin/songs/playlist/{id}/order` | `{direction}` | `200` |
| 바로 재생 | `POST` | `/admin/songs/playlist/{id}/play` | — | `200` |
| 재생 종료 | `POST` | `/admin/songs/current/finish` | `{id}` | `200` |
| 재생 취소 | `POST` | `/admin/songs/current/cancel` | `{id}` | `200` |

오류는 `{code, message}` 형식. `404`는 NOT_FOUND, `409`는 CONFLICT.

## 현재 구조

```
frontend/app/admin/songs/
├── page.tsx              ← 목 저장소에서 데이터 조회
├── _actions.ts           ← 목 저장소 호출 (교체 대상)
├── _components/
│   ├── AddToPlaylistForm.tsx
│   ├── CancelRequestForm.tsx
│   ├── OnAirPlayer.tsx
│   ├── RequestCard.tsx
│   └── YouTubePreview.tsx
└── music-box.module.css
```

**컴포넌트는 수정 불필요.** `page.tsx`의 데이터 조회와 `_actions.ts`의 목 호출만 `apiFetch`로 교체하면 됨.

## 시나리오

### 1. 목록 조회

F1 전체 목록
- Given 백엔드에 상태가 다른 신청곡 여러 건이 있다.
- When `/admin/songs`를 연다.
- Then `GET /admin/songs`로 받은 목록을 현재 선곡·플레이리스트·접수된 신청곡·지난 선곡 4개 섹션으로 나눠 보여 준다.

F2 빈 목록
- Given 신청곡이 없다.
- Then 각 섹션에 안내 문구가 보인다.

### 2. 플레이리스트 담기

F3 정상
- Given 접수된 신청곡에 YouTube 링크를 입력했다.
- When 플레이리스트에 담기 버튼을 누른다.
- Then `POST /admin/songs/playlist`에 `{songId, youtubeVideoId}`를 보내고, 성공하면 화면이 갱신된다.

F4 잘못된 링크
- When YouTube 링크 형식이 아닌 값을 입력한다.
- Then 서버에 보내지 않고 "YouTube 영상 링크를 넣어 주세요" 안내가 나온다.

### 3. 순서 변경

F5 정상
- When 플레이리스트에서 ▲/▼ 버튼을 누른다.
- Then `PUT /admin/songs/playlist/{id}/order`에 `{direction}`을 보내고 순서가 바뀐다.

F6 경계
- When 맨 앞 곡에서 ▲, 맨 뒤 곡에서 ▼를 누른다.
- Then 버튼이 비활성화돼 있어 요청이 가지 않는다.

### 4. 바로 재생

F7 정상
- When 플레이리스트 곡의 "지금 재생" 버튼을 누른다.
- Then `POST /admin/songs/playlist/{id}/play`를 보내고 현재 선곡이 갱신된다.

### 5. 재생 종료·취소

F8 종료
- When 현재 선곡의 "재생 완료" 버튼을 누른다.
- Then `POST /admin/songs/current/finish`에 `{id}`를 보내고 지난 선곡으로 넘어간다.

F9 취소
- When 현재 선곡의 "선곡 취소" 버튼을 누른다.
- Then `POST /admin/songs/current/cancel`에 `{id}`를 보내고 접수된 신청곡으로 돌아간다.

### 6. 접수 취소

F10 정상
- When 접수된 신청곡의 "접수 취소" 버튼을 누른다.
- Then `PUT /admin/songs/{id}/cancel`을 보내고 목록에서 사라진다.

## 작업 순서

각 단계를 완료하면 체크하고, 이해한 뒤 다음 단계로 넘어간다.

### 단계 1: 응답 타입 정의
- [ ] `frontend/app/admin/songs/_lib/types.ts` 생성
- [ ] 백엔드 응답 필드에 맞는 `SongResponse` 타입 정의
  ```ts
  export type SongResponse = {
    id: number;
    requesterName: string;
    songTitle: string;
    artist: string;
    story: string;
    status: "pending" | "queued" | "playing" | "played" | "cancelled";
    youtubeVideoId: string | null;
    playlistOrder: number | null;
    createdAt: string;
    playedAt: string | null;
    startedAt: string | null;
    durationSeconds: number | null;
  };
  ```
- [ ] 이해 확인: 목 데이터의 `MusicRequest`와 비교해서 차이점 파악 (id가 string → number, userId 없음)

### 단계 2: API 조회 함수 작성
- [ ] `frontend/app/admin/songs/_lib/api.ts` 생성
- [ ] `apiFetch`를 사용해서 `GET /admin/songs` 호출하는 `fetchSongs()` 함수 작성
  ```ts
  import { apiFetch } from "@/app/_lib/api/client";
  import type { SongResponse } from "./types";

  export async function fetchSongs(): Promise<SongResponse[]> {
    return apiFetch<SongResponse[]>("/api/v1/admin/songs");
  }
  ```
- [ ] 이해 확인: `apiFetch`가 쿠키를 자동으로 붙이는 이유 (서버 컴포넌트 → 서버 간 호출이라 브라우저 쿠키가 안 붙으니까 직접 넣음)

### 단계 3: page.tsx에서 목 → API 조회로 교체
- [ ] `page.tsx`에서 `mockMusicBoxRepository.list()` 대신 `fetchSongs()` 사용
- [ ] 목 데이터의 헬퍼 함수들(`playlistOf`, `inboxOf`, `onAirOf`, `musicBoxVersion`)을 `_lib/` 아래로 옮기거나 `SongResponse` 타입에 맞게 수정
- [ ] `MusicRequest` 타입 참조를 `SongResponse`로 교체
- [ ] 이해 확인: page.tsx는 Server Component라 `apiFetch`를 직접 쓸 수도 있지만, 조회 함수를 분리하면 재사용과 테스트가 쉬움

### 단계 4: _actions.ts에서 목 → API 호출로 교체
- [ ] `addToPlaylist`: `mockMusicBoxRepository.addToPlaylist()` → `apiFetch("POST /admin/songs/playlist", ...)`
- [ ] `cancelRequest`: `mockMusicBoxRepository.cancelRequest()` → `apiFetch("PUT /admin/songs/{id}/cancel")`
- [ ] `moveInPlaylist`: `mockMusicBoxRepository.moveInPlaylist()` → `apiFetch("PUT /admin/songs/playlist/{id}/order", ...)`
- [ ] `playNow`: `mockMusicBoxRepository.playNow()` → `apiFetch("POST /admin/songs/playlist/{id}/play")`
- [ ] `finishCurrent`: `mockMusicBoxRepository.advance()` → `apiFetch("POST /admin/songs/current/finish", ...)`
- [ ] `cancelCurrent`: `mockMusicBoxRepository.cancelCurrent()` → `apiFetch("POST /admin/songs/current/cancel", ...)`
- [ ] 에러 처리: `ApiRequestError`를 catch해서 `{ error: message }`로 반환
- [ ] 이해 확인: `revalidatePath()`는 그대로 유지 — API 호출 성공 후 캐시를 무효화해야 화면이 갱신됨

### 단계 5: 백엔드에 없는 동작 처리
- [ ] `returnToInbox` — 백엔드 엔드포인트 없음. 팀에 필요 여부 확인
- [ ] `moveToPlayed` — 백엔드 엔드포인트 없음. 팀에 필요 여부 확인
- [ ] 결정 전까지: 해당 버튼에 `disabled` 또는 UI에서 숨기기, 혹은 목 호출 유지하고 주석으로 표시
- [ ] 이해 확인: 백엔드 계획 문서에 "Service 메서드로만 구현해두고 Controller에 연결하지 않는다"고 적혀 있음

### 단계 6: 확인
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] 백엔드를 로컬에 띄우고 브라우저에서 F1~F10 시나리오 확인
- [ ] 목 저장소 import가 `_actions.ts`와 `page.tsx`에서 완전히 제거됐는지 확인

## 변경 대상 파일 요약

| 파일 | 변경 내용 |
| --- | --- |
| `app/admin/songs/_lib/types.ts` | 새로 생성 — `SongResponse` 타입 |
| `app/admin/songs/_lib/api.ts` | 새로 생성 — `fetchSongs()` |
| `app/admin/songs/page.tsx` | 목 저장소 → `fetchSongs()`, 타입 교체 |
| `app/admin/songs/_actions.ts` | 목 저장소 → `apiFetch` 호출 |
| `app/admin/songs/_components/*` | **수정 없음** |

## 브랜치·커밋

- 브랜치: `feature/admin-songs-frontend` (`origin/develop` 기준)
- 커밋:
  1. `docs: 관리자 선곡 프론트 연결 계획 추가`
  2. `feat: 관리자 선곡 화면을 백엔드 API에 연결`
- PR 대상은 `develop`, 머지는 사람이 한다.
- 백엔드 `feature/admin-songs-playback` PR이 먼저 머지돼야 API가 동작한다. PR 본문에 의존 관계를 적는다.

## 범위 밖

- 고객 신청곡 페이지(`/musicbox`) API 연결: 별도 계획
- `MusicBoxRefresher`(자동 갱신 폴링) 연결: 백엔드에 version 확인 API가 생긴 뒤
- 관리자 인증: `feature/session-auth-*` 머지 후
- `durationSeconds` 기록 API: 백엔드 계획에서 별도 작업으로 분리됨
- `recordDuration` (목 저장소에만 있는 동작): 백엔드 엔드포인트 결정 후

## 가정

- 백엔드 응답의 `id`는 `number`(Long)이고, 목 데이터의 `string`(UUID)과 다르다. `apiFetch` 응답을 그대로 쓰면 타입이 맞는다.
- `API_ORIGIN` 환경변수가 `.env.local`에 설정돼 있다 (예: `API_ORIGIN=http://localhost:8080`).
- 인증 쿠키가 있어야 관리자 API가 응답한다. 인증이 아직 없으면 백엔드에서 접근 제어를 일시적으로 열어 둔 상태여야 한다.
- `returnToInbox`, `moveToPlayed`는 팀 확인 전까지 미결 상태로 둔다.

## 참고

- 2026-10-26 확인: `_actions.ts`의 8개 함수 중 6개가 백엔드 8개 엔드포인트와 1:1 대응. `returnToInbox`와 `moveToPlayed`만 대응 엔드포인트 없음.
- 2026-10-26 확인: `apiFetch`는 `frontend/app/_lib/api/client.ts`에 있고, `API_ORIGIN` + 경로 + 쿠키 전달 + 에러 파싱을 처리함.
- 2026-10-26 확인: 컴포넌트 5개는 props로만 데이터를 받아서 API 교체와 무관. `page.tsx`와 `_actions.ts`만 수정하면 됨.
