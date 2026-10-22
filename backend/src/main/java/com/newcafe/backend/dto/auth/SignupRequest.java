package com.newcafe.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SignupRequest(
        String name,
        String email,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String passwordConfirm
) {
    @Override
    public String toString() {
        return "SignupRequest[credentials=REDACTED]";
    }
}
