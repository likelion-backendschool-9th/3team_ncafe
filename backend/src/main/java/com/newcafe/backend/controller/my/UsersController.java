package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.service.my.UsersService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/my")
@RequiredArgsConstructor
public class UsersController {

    private final UsersService usersService;

    @GetMapping
    public ResponseEntity<MemberResponse> getCurrent(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(usersService.getCurrent(member.getId()));
    }
}
