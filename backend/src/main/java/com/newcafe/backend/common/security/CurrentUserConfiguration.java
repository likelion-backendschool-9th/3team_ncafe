package com.newcafe.backend.common.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CurrentUserConfiguration {

    @Bean
    @ConditionalOnMissingBean(CurrentUserContext.class)
    CurrentUserContext unavailableCurrentUserContext() {
        return () -> {
            throw new AuthenticationRequiredException();
        };
    }
}
