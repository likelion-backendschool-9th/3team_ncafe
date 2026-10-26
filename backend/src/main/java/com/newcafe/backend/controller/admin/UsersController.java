package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.users.UpdateUserStatusRequest;
import com.newcafe.backend.dto.users.UserPageResponse;
import com.newcafe.backend.dto.users.UserResponse;
import com.newcafe.backend.dto.users.UserSearchRequest;
import com.newcafe.backend.dto.users.UserSummaryResponse;
import com.newcafe.backend.service.admin.UsersService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("adminUsersController")
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UsersController {

    private final UsersService usersService;

    @GetMapping
    public UserPageResponse list(@Valid @ModelAttribute UserSearchRequest request) {
        return usersService.list(request);
    }

    @GetMapping("/summary")
    public UserSummaryResponse summary() {
        return usersService.summary();
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return usersService.get(id);
    }

    @PutMapping("/{id}")
    public UserResponse changeStatus(@PathVariable Long id, @Valid @RequestBody UpdateUserStatusRequest request) {
        return usersService.changeStatus(id, request);
    }
}
