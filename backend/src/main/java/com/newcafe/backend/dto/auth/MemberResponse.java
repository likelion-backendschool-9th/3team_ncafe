package com.newcafe.backend.dto.auth;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

public record MemberResponse(Long id, String name, String email, UserRole role, UserStatus status) {

    public static MemberResponse from(User user) {
        return new MemberResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getStatus());
    }
}
