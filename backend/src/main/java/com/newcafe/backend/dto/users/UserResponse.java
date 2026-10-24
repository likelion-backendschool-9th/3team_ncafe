package com.newcafe.backend.dto.users;

import com.newcafe.backend.entity.user.User;

public record UserResponse(
        Long id,
        String name,
        String email,
        String role,
        String status
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().value(),
                user.getStatus().value()
        );
    }
}
