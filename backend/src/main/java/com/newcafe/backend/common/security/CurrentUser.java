package com.newcafe.backend.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 요청한 회원의 ID를 알려 준다.
 *
 * <p>TODO(임시): 백엔드 로그인(feature/session-auth 3단계)이 아직 없어 설정값의 고정 회원 ID를 돌려준다.
 * 누가 호출해도 같은 회원으로 처리되므로, 세션 인증의 principal로 교체하기 전에는 develop에 머지하지 않는다.
 * 로그인이 붙으면 이 클래스만 바꾸고 Controller·Service는 그대로 둔다.
 */
@Component
public class CurrentUser {

    private final Long userId;

    public CurrentUser(@Value("${app.temporary-current-user-id:1}") Long userId) {
        this.userId = userId;
    }

    public Long id() {
        return userId;
    }
}
