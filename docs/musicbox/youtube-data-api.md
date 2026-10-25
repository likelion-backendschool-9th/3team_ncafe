# YouTube Data API 사용 정리 (팀 공용)

뮤직박스에서 YouTube 영상 정보를 서버가 직접 확인해야 할 때 참고하는 문서다. 구현 계획이 아니다.

## 한눈에

- 지금: 관리자가 YouTube 링크를 붙이면 브라우저 플레이어가 영상 길이를 재서 서버에 보낸다. YouTube Data API는 호출하지 않는다.
- 쓰면 좋아지는 점:
  - 플레이리스트에 담는 순간 서버가 영상 길이를 확정한다.
  - 임베드할 수 없거나 비공개인 영상을 미리 거른다.
- 쓰는 곳: 관리자 `addToPlaylist`(링크 붙이기)에서만 쓴다. 고객 API는 호출하지 않는다.
- 별도 계획: 고객 쪽에는 필요 없다. 관리자 쪽에서 도입하기로 하면 그 브랜치 기준으로 scenario-plan을 따로 쓴다.

## 호출할 API

`GET https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status,snippet&id=<영상ID>&key=<API 키>`

| 필드 | 뜻 | 뮤직박스에서 쓰는 방법 |
|---|---|---|
| `contentDetails.duration` | ISO 8601 길이. 예: `PT4M5S`, `PT1H2M3S`, 하루 이상은 `P1DT…` | 초로 바꿔 `duration_seconds`에 저장한다. 0초 초과 6시간 이하만 받는다. 실제 재생 길이와 1초 정도 차이 날 수 있다. |
| `status.embeddable` | 다른 사이트에 임베드할 수 있는지 | `false`면 담지 않는다. `true`여도 저작권 주장 등으로 재생이 막힐 수 있다. |
| `status.privacyStatus` | `public`, `unlisted`, `private` | `private`면 담지 않는다. |
| `status.uploadStatus` | `processed`, `uploaded`, `failed`, `rejected`, `deleted` | `processed`가 아니면 담지 않는다. |
| `snippet.title` | 영상 제목 (최대 100자) | 관리자 확인용으로 보여 준다. 신청곡 제목은 바꾸지 않는다. |
| `contentDetails.regionRestriction` | 허용·차단 국가 목록 | `KR`이 차단돼 있으면 담지 않는다. |

- 영상 ID 추출은 지금 프론트의 `frontend/app/_lib/youtube.ts`(`parseYouTubeVideoId`) 규칙을 그대로 따른다.
- 결과 `items`가 비어 있으면 없는 영상으로 처리한다.

## 쿼터

| 항목 | 값 |
|---|---|
| 기본 할당 | `search.list` 하루 100회, `videos.insert` 하루 100회, 나머지 엔드포인트 합계 하루 10,000 units |
| `videos.list` | 호출 1회에 1 unit |
| `search.list` | 별도 할당 하루 100회 (호출 1회에 1). 곡명 검색 기능은 이 한도 때문에 넣지 않는다. |
| 초기화 | 매일 자정(미국 태평양 시간), 한국 시각 오후 4~5시 |

- 관리자가 링크를 하루 수백 번 붙여도 `videos.list`는 한도 안에 든다.
- 같은 영상 ID를 다시 조회하지 않도록, 이미 길이가 있는 곡은 호출하지 않는다.

## 키 관리

- 키는 Google Cloud 프로젝트에서 발급하고, YouTube Data API v3만 쓰도록 API 제한을 건다.
- 백엔드 환경변수 `YOUTUBE_API_KEY`로 읽는다. 브라우저에 보내지 않는다.
- 키 값은 커밋하지 않는다. 설정 예시 파일에는 변수 이름만 적는다.

## 실패 처리

| 상황 | 응답 | 뮤직박스 동작 |
|---|---|---|
| 쿼터 초과 | `403 quotaExceeded` | 길이 없이 담는다. 지금처럼 브라우저가 잰 길이를 기록한다. |
| 네트워크 오류·시간 초과 | - | 위와 같다. 담기 자체를 실패시키지 않는다. |
| 없는 영상 | 빈 `items` 또는 `404 videoNotFound` | 담지 않고 "영상을 찾을 수 없습니다"를 반환한다. |
| 키 없음 | - | API를 호출하지 않고 지금 방식으로 동작한다. |

## 참고

- [Quota costs](https://developers.google.com/youtube/v3/determine_quota_cost): 기본 할당, `videos.list` 1 unit, `search.list` 하루 100회, 초기화 시각 (2026-10-25 확인)
- [Videos 리소스](https://developers.google.com/youtube/v3/docs/videos): `duration`, `embeddable`, `privacyStatus`, `uploadStatus`, `title`, `regionRestriction` 설명 (2026-10-25 확인)
- [Errors](https://developers.google.com/youtube/v3/docs/errors): `quotaExceeded`(403), `videoNotFound`(404) (2026-10-25 확인)
