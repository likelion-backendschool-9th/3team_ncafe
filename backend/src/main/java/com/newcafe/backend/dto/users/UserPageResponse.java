package com.newcafe.backend.dto.users;

import com.newcafe.backend.entity.user.User;

import java.util.List;

import org.springframework.data.domain.Page;

public record UserPageResponse(
        List<UserResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static UserPageResponse from(Page<User> users) {
        return new UserPageResponse(
                users.map(UserResponse::from).getContent(),
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages()
        );
    }
}
