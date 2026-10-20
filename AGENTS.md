# Git 협업 규칙 (AI 에이전트 & 팀원 공통)

이 문서는 Codex, Claude Code 등 모든 AI 에이전트와 팀원이 따르는 Git 규칙이다.
AI 에이전트는 커밋 → 푸시 → PR 생성까지 수행하고, **머지는 사람이 한다.**

---

## 1. 브랜치 전략 (Git Flow)

브랜치는 아래 4종류만 사용한다.

| 브랜치      | 역할                                   | 분기 기준 | PR 대상                                    | 머지 방식             |
| ----------- | -------------------------------------- | --------- | ------------------------------------------ | --------------------- |
| `main`      | 배포                                   | -         | -                                          | -                     |
| `develop`   | 개발 통합                              | `main`    | `main` (배포 시)                           | Create a merge commit |
| `feature/*` | 기능 개발, 버그 수정 등 모든 일반 작업 | `develop` | `develop`                                  | Squash and merge      |
| `hotfix/*`  | 운영 긴급 수정                         | `main`    | `main` → 머지 후 `main`을 `develop`에 반영 | Squash and merge      |

```
main ──────────●────────────●──────
  │            ↑ 배포        ↑
  │  hotfix/* ─┘(긴급)       │
  └ develop ───●────●────────┘
               ↑    ↑
     feature/* ┘    └ feature/*
```

- `main`, `develop`에는 직접 커밋/푸시하지 않는다. 항상 PR로만 반영한다.

---

## 2. 브랜치 네이밍

```
feature/<짧은-설명>
hotfix/<짧은-설명>
```

- 영어 소문자, 숫자, 하이픈(`-`)만 사용
- 설명은 2~4단어
- 이슈 번호는 브랜치명에 넣지 않고 PR 본문에 `Closes #12`로 연결

| 예시                     | 설명                         |
| ------------------------ | ---------------------------- |
| `feature/login-api`      | 로그인 API 개발              |
| `feature/cart-total-bug` | 장바구니 총액 버그 수정      |
| `hotfix/payment-timeout` | 운영 결제 타임아웃 긴급 수정 |

---

## 3. 커밋 메시지

```
<type>: <제목>

<본문 - 선택>
```

### 커밋 타입

| type       | 언제 쓰나                               | 예시                                    |
| ---------- | --------------------------------------- | --------------------------------------- |
| `feat`     | 새로운 기능 추가                        | `feat: 카카오 소셜 로그인 추가`         |
| `fix`      | 버그 수정                               | `fix: 할인 적용 시 총액 계산 오류 수정` |
| `refactor` | 동작은 그대로, 코드 구조만 개선         | `refactor: 응답 포맷 공통 함수로 분리`  |
| `style`    | 포맷팅, 세미콜론 등 코드 의미 변화 없음 | `style: prettier 적용`                  |
| `docs`     | 문서 수정 (README, 주석 등)             | `docs: 설치 방법 README에 추가`         |
| `test`     | 테스트 추가/수정                        | `test: 로그인 실패 케이스 테스트 추가`  |
| `chore`    | 빌드, 설정, 패키지 등 기타 작업         | `chore: eslint 9 버전으로 업데이트`     |

### 작성 규칙

- 제목은 한국어, 50자 이내, 마침표 없이 "~ 추가 / ~ 수정 / ~ 삭제" 형태로 끝낸다.
- 본문은 "왜 바꿨는지" 설명이 필요할 때만 쓴다.
- 커밋 하나에는 논리적 변경 하나만 담는다. 관련 없는 변경을 섞지 않는다.

---

## 4. AI 에이전트 작업 절차

### 4-1. 작업 시작

```bash
git fetch origin
git switch -c feature/<설명> origin/develop   # 긴급 수정: git switch -c hotfix/<설명> origin/main
```

- 이미 작업 브랜치에 있다면 새로 만들지 말고 그 브랜치에서 계속한다.

### 4-2. 커밋

- 작업 단위마다 위 커밋 규칙대로 커밋한다.
- 커밋 전 프로젝트의 lint / test 명령이 있으면 실행하고, 실패하면 고친 뒤 커밋한다.
- `git add .` 대신 변경한 파일을 지정해서 add 한다.

### 4-3. 푸시 전 최신화

```bash
git fetch origin
git rebase origin/develop   # hotfix는 origin/main
```

- **충돌이 나면 임의로 해결하지 말고** `git rebase --abort` 후 사람에게 보고한다.

### 4-4. 푸시 & PR

```bash
git push -u origin HEAD
gh pr create --base develop --title "<커밋 메시지 형식>" --body "<PR 템플릿 내용>"
# hotfix는 --base main
```

- PR 제목은 커밋 메시지 형식과 동일하게 쓴다 (Squash 머지 시 이 제목이 커밋이 됨).
- PR 본문은 `.github/pull_request_template.md` 형식을 채운다.
- PR 하나에는 목적 하나만 담는다. 너무 크면 나눈다 (권장: 변경 400줄 이하).

### 4-5. 절대 하지 말 것

- `main`, `develop`에 직접 커밋/푸시
- `git push --force` (본인 브랜치에서 rebase 후 필요하면 `--force-with-lease`만 허용)
- PR 머지, 브랜치 삭제, 다른 사람 브랜치 수정
- `.env`, 키, 토큰 등 비밀정보 커밋
- 요청받지 않은 대규모 리팩터링/포맷팅을 끼워 넣기
