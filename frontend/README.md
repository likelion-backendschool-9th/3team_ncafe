# 삼다방 프론트엔드

Next.js App Router와 TypeScript로 구성한 프론트엔드 기본 구조다. 화면 범위와 단계는 [프론트엔드 청사진](../frontend-청사진.md)을 따른다.

## 로컬 실행

```bash
cd frontend
npm install
cp .env.local.example .env.local
# .env.local의 MOCK_SESSION_SECRET을 32자 이상 임의 문자열로 변경
npm run dev
```

세션 키는 각 개발 환경에서 새로 만들어야 한다. `openssl rand -base64 32`로 생성할 수 있다.

## 목 인증

백엔드 인증 계약이 정해지기 전까지 로컬 개발에서만 쓰는 목 인증이다. 첫 실행 시 `.data/users.json`에 아래 계정을 만든다.

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 관리자 | `admin@ncafe.local` | `demo1234!` |
| 고객 | `customer@ncafe.local` | `demo1234!` |

회원가입으로 만든 고객 계정도 `.data/users.json`에 저장된다. 비밀번호는 해시로 저장하고, 세션은 서명된 HttpOnly 쿠키로 관리한다. 목 저장소는 운영 환경에서 동작하지 않도록 막아 두었다. 실제 서비스용 인증과 결제는 후속 단계에서 별도 계약과 제공자를 확정해야 한다.

## 뮤직박스

`/music-box`에서 방문자가 이름, 신청곡, 가수, 사연을 남기면 `.data/music-requests.json`에 접수된다. `/admin/music-box`에서 관리자가 사연을 확인하고 재생 가능한 HTTPS 음원 주소를 입력하거나 MP3·M4A·OGG·WAV 파일(최대 25MB)을 올려 선곡한다. 로컬 업로드는 Git에서 제외된 `public/audio/`에 저장한다. 고객 화면과 관리자 화면의 오디오 플레이어에서 재생 버튼을 누르면 해당 음원을 들을 수 있다. 곡이 끝나면 관리자가 `재생 완료로 표시`를 누른다. 브라우저의 자동 재생 제한 때문에 다른 방문자의 재생이 자동으로 시작되거나 서로 동기화되지는 않는다. 음원 사용 권한과 실제 서비스용 저장소는 배포 전에 별도로 준비해야 한다.

## 프론트엔드 메뉴 계약

관리자 메뉴 화면은 프론트엔드 모델을 기준으로 먼저 구현한다. 메뉴 필드는 `id`, `name`(한글), `nameEn`(영어), `imageUrl`, `description`, `category`, `price`, `available`, `isNew`, `recommended`, `createdAt`, `updatedAt`이다. 목록 맨 왼쪽에 이미지를 표시한다. 검색 영역에서 한글·영문 메뉴명, 카테고리·상태 필터와 정렬을 선택한 뒤 검색 버튼으로 함께 적용한다. 등록일은 목록에 표시하고 정렬에 사용할 수 있다. 등록·수정 폼에서 메뉴명, 이미지 주소, 설명, 가격, 판매 상태, NEW·추천 여부를 입력하고, 카테고리는 목업 목록(커피·논커피·차·디저트·기타)에서 선택한다. 이미지 주소를 비우면 기본 이미지가 사용된다.

현재 관리자 화면은 `app/_lib/mock/menus.ts`를 통해 `.data/menus.json`에 등록·수정·삭제 결과를 저장한다. 백엔드 API는 이 화면 계약에 맞춰 추후 연결한다. `.data/`는 Git에서 제외한다.

## 확인 명령

```bash
npm run typecheck
npm run lint
npm run build
```
