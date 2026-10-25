package com.newcafe.backend.common.security;

import com.newcafe.backend.dto.auth.MemberResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

@Component
public class LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JsonMapper jsonMapper;

    public LoginSuccessHandler(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        SessionUserDetails member = (SessionUserDetails) authentication.getPrincipal();
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Cache-Control", "no-store");
        jsonMapper.writeValue(response.getOutputStream(), new MemberResponse(member.getId(), member.getName(),
                member.getEmail(), member.getRole(), member.getStatus()));
    }
}
