package com.newcafe.backend.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// 시각에 따라 동작이 달라지는 서비스가 테스트에서 고정 시각을 쓰도록 주입한다.
@Configuration
public class ClockConfiguration {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
