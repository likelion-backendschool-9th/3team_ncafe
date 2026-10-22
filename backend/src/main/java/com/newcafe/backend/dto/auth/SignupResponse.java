package com.newcafe.backend.dto.auth;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

public record SignupResponse(Long id, String name, String email, UserRole role, UserStatus status) {

    public static SignupResponse from(User user) {
        return new SignupResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getStatus());
    }
}
