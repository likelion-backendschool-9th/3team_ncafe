package com.newcafe.backend.dto.auth;

public record CsrfResponse(String headerName, String parameterName, String token) {
}
