# 세션 인증 E2E

운영·개발 DB에 실행하지 않는다. 아래 명령은 `ncafe_auth_e2e` 전용 컨테이너와 임시 포트만 사용한다. 브라우저 테스트 중 관리자 fixture 하나의 역할을 이 컨테이너에서만 변경하며 DB 이름·사용자를 먼저 검사한다.

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
node e2e/fixtures/backend-proxy.mjs
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

11개 검사 중 3개는 전송 계층·안전한 next 경로 검사, 8개는 실제 Chromium 브라우저 흐름이다. `E2E_BASE_URL`과 `E2E_PG_CONTAINER`로 검증 서버·전용 DB 컨테이너 이름을 바꿀 수 있다. Playwright를 임시 경로에 설치했다면 설치와 실행에 같은 `PLAYWRIGHT_BROWSERS_PATH`를 지정한다. 결과·스크린샷·실패 trace는 운영체제 임시 폴더의 `ncafe-auth-e2e-results`에 기록한다.

완료 후 직접 실행한 서버들을 종료하고 `docker stop ncafe-auth-e2e-pg`로 전용 DB를 제거한다. 일반 프론트 실행은 중계 서버 없이 실제 백엔드의 `API_ORIGIN`을 사용한다.
