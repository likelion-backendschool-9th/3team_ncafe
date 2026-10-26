package com.newcafe.backend.entity.user;

import org.springframework.test.util.ReflectionTestUtils;

// 테스트용 고객 회원. 저장하지 않고 id만 정해 둔다.
public final class TestUsers {

    private TestUsers() {
    }

    public static User withId(Long id) {
        User user = User.createCustomer("민지", "member" + id + "@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
