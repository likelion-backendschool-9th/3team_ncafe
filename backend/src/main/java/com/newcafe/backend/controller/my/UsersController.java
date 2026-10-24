package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.CurrentUser;
import com.newcafe.backend.dto.users.UserResponse;
import com.newcafe.backend.service.my.UsersService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("myUsersController")
@RequestMapping("/api/v1/my")
@RequiredArgsConstructor
public class UsersController {

    private final UsersService usersService;
    private final CurrentUser currentUser;

    @GetMapping
    public UserResponse me() {
        return usersService.getMe(currentUser.id());
    }
}
