# 세션 인증·관리자 주문 E2E

운영·개발 DB에 실행하지 않는다. 아래 명령은 `ncafe_auth_e2e` 전용 컨테이너와 임시 포트만 사용한다. 각 테스트가 만든 관리자 fixture의 역할을 이 전용 DB에서만 변경하며 DB 이름·사용자를 먼저 검사한다.

```sh
docker run --rm -d --name ncafe-auth-e2e-pg \
  -e POSTGRES_DB=ncafe_auth_e2e -e POSTGRES_USER=ncafe_test -e POSTGRES_PASSWORD=ncafe_test \
  -p 127.0.0.1:15432:5432 postgres:16-alpine
```

백엔드 터미널:

```sh
cd backend
./gradlew bootRun --args='--server.port=18080 --spring.config.import= --spring.sql.init.mode=never --spring.jpa.hibernate.ddl-auto=update --spring.datasource.url=jdbc:postgresql://localhost:15432/ncafe_auth_e2e --spring.datasource.username=ncafe_test --spring.datasource.password=ncafe_test --app.security.allowed-origins=http://localhost:13000'
```

별도 터미널에서 테스트 중계 서버를 실행한다. 일반 요청은 위 백엔드로 전달하고 `fail-login-*` 테스트 계정의 첫 로그인만 503으로 만들어 가입 성공·자동 로그인 실패 흐름을 확인한다. 제품 코드에는 테스트용 동작을 추가하지 않는다.

```sh
cd frontend
E2E_ORDER_FAULTS=1 node e2e/fixtures/backend-proxy.mjs
```

프론트 터미널:

```sh
cd frontend
npm ci
API_ORIGIN=http://localhost:18081 npm run dev -- --hostname localhost --port 13000
```

테스트 터미널:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

28개 검사 중 12개는 쿠키·CSRF 전송과 주문 응답/URL/페이지 파서 검사, 16개는 실제 Chromium 브라우저 흐름(인증 8개·주문 8개)이다. 주문 검사는 관리자·고객을 실제 가입/로그인 API로 만들고 테스트 DB에서 해당 관리자 역할과 주문 fixture만 설정한다. 각 주문 테스트는 자신이 만든 회원·메뉴·주문만 정리한다. 기존 인증 fixture를 전역 삭제하지 않는다. `E2E_BASE_URL`과 `E2E_PG_CONTAINER`로 검증 서버·전용 DB 컨테이너 이름을 바꿀 수 있다. Playwright를 임시 경로에 설치했다면 설치와 실행에 같은 `PLAYWRIGHT_BROWSERS_PATH`를 지정한다. 결과·스크린샷·실패 trace는 운영체제 임시 폴더의 `ncafe-auth-e2e-results`에 기록한다.

완료 후 직접 실행한 서버들을 종료하고 `docker stop ncafe-auth-e2e-pg`로 전용 DB를 제거한다. 일반 프론트 실행은 중계 서버 없이 실제 백엔드의 `API_ORIGIN`을 사용한다.

## 로컬 PostgreSQL을 쓰는 경우

Docker 대신 **임시 클러스터**를 localhost에 띄워 같은 전용 DB/사용자를 준비할 수도 있다. 개발 DB를 재사용하지 않는다. 백엔드 실행 인자는 위와 같으며, 테스트에만 다음 값을 지정한다.

```sh
E2E_TEST_DB_URL=postgresql://ncafe_test@localhost:15432/ncafe_auth_e2e npm run test:e2e
```

`fixtures/postgres.ts`는 localhost·전용 DB/사용자만 허용하고, SQL 실행 전 실제 접속 DB/사용자도 검사한다. 이 환경변수를 생략하면 기존 Docker fixture 계약을 그대로 사용한다.

`E2E_ORDER_FAULTS=1`인 테스트 중계 서버만 `/api/v1/__e2e/orders-fault`를 처리한다. 로그인 세션별로 주문 목록 503/잘못된 JSON, PUT 실패, CSRF 실패를 주입하고 `off`로 해제한다. 일반 제품 코드·백엔드에는 이 API가 없다. 이 옵션 없이 인증 테스트만 실행하는 기존 방법도 유지된다.

주문 E2E는 `npm run build` 후 `API_ORIGIN=http://localhost:18081 npm run start -- --hostname localhost --port 13000`에서도 검증한다. rewrites의 대상은 빌드 때 결정되므로 **빌드 때도 같은 `API_ORIGIN`을 지정**한다. 루트 홈·관리자 홈 등 아직 목 저장소를 쓰는 다른 화면의 배포 모드 오류는 이번 주문 검증 범위와 구분한다.

## 관리자 카테고리·메뉴 E2E

`admin-categories.spec.ts`와 `admin-menus.spec.ts`는 위와 같은 전용 DB·백엔드를 쓰고, 중계 서버 없이 실행할 수 있다. 관리자 계정은 `fixtures/admin.ts`가 가입 → 전용 DB에서만 역할 변경 → 로그인으로 만든다. 카테고리 이름에 실행마다 다른 접미사를 붙이므로 같은 DB에서 반복 실행해도 된다.

```sh
cd frontend
API_ORIGIN=http://localhost:18080 npm run dev -- --hostname localhost --port 13000
npm run test:e2e -- admin-categories admin-menus
```

백엔드가 꺼진 화면(C4)은 브라우저에서 직접 확인한다.
