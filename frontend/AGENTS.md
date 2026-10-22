<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 프론트엔드 작업 기준

프론트엔드 작업의 기준 문서는 [`../docs/FRONTEND.md`](../docs/FRONTEND.md) 하나다. 코드를 작성하거나 고치기 전에 아래를 확인한다.

- 2장 라우트-컨트롤러 매핑: 작업하는 페이지의 주 컨트롤러와 엔드포인트. 매핑표에 없는 URL이나 예외를 임의로 만들지 않는다.
- 5장 개발 규칙: 폴더 구조, 상태 관리, 컴포넌트, 접근성, SEO, 데이터·API, 인증.
- 8장 작업 분배표: 해당 페이지-컨트롤러 쌍의 규칙 갭, 남은 작업, 선행 의존.
- PR 전에는 9장 체크리스트를 확인한다.

데이터·API는 `../backend/docs/2026-10-20-backend-blueprint.md`, 용어는 `../GLOSSARY.md`를 따른다. `../docs/frontend-청사진.md`는 `FRONTEND.md`로 통합되기 전의 원문이다. 기능 범위와 흐름의 출처로만 참고하고, URL·진행 현황·규칙은 `FRONTEND.md`를 따른다.
