package com.newcafe.backend.common.security;

public interface CurrentUserContext {

    AuthenticatedUser requireCurrentUser();
}
