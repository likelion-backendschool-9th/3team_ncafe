## 목적

<!-- 이 PR이 해결하는 문제 한두 줄. PR 하나에는 목적 하나만 담는다. -->

Closes #

## 변경 내용

-

## 페이지-컨트롤러 쌍 (프론트 변경 시)

<!-- docs/FRONTEND.md 2장 매핑표 기준. 예: `/admin/menus` ↔ `admin/MenusController` -->

- 쌍:
- 사용한 엔드포인트:

## 확인

- [ ] 커밋 메시지와 PR 제목이 AGENTS.md 규칙을 따른다
- [ ] `.env`, 키, 토큰 등 비밀정보가 포함되지 않았다
- [ ] lint / test를 실행했다 (프론트: `npm run lint`, `npm run typecheck` / 백엔드: `./gradlew test`)

### 프론트 변경 시

- [ ] 대응 컨트롤러·엔드포인트가 `docs/FRONTEND.md` 2장 매핑표와 일치한다
- [ ] `docs/FRONTEND.md` 9장 PR 체크리스트를 확인했다
- [ ] 이 쌍의 8장 규칙 갭 중 처리한 항목과 남긴 항목을 "변경 내용"에 적었다

## 테스트 방법

<!-- 확인한 화면 흐름이나 API 요청 -->
