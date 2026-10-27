package com.newcafe.backend.config;

import com.newcafe.backend.common.security.SecurityErrorHandler;
import com.newcafe.backend.common.security.LoginSuccessHandler;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.common.security.ApiLogoutSuccessHandler;
import com.newcafe.backend.common.security.SessionCookieLogoutHandler;
import com.newcafe.backend.common.security.SessionMemberFilter;
import com.newcafe.backend.common.security.SessionMemberService;

import jakarta.servlet.DispatcherType;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableConfigurationProperties(ServerProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityErrorHandler errors,
            LoginSuccessHandler loginSuccessHandler, AuthenticationManager authenticationManager,
            ApiLogoutSuccessHandler logoutSuccessHandler, SessionCookieLogoutHandler sessionCookies,
            SessionMemberService sessionMembers, SecurityContextRepository contextRepository,
            UrlBasedCorsConfigurationSource corsConfigurationSource)
            throws Exception {
        http
                .authenticationManager(authenticationManager)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(form -> form
                        .loginPage("/api/v1/auth/login")
                        .loginProcessingUrl("/api/v1/auth/login")
                        .usernameParameter("email")
                        .successHandler(loginSuccessHandler)
                        .failureHandler(errors))
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .addLogoutHandler(sessionCookies)
                        .logoutSuccessHandler(logoutSuccessHandler))
                .securityContext(context -> context.securityContextRepository(contextRepository))
                .requestCache(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(errors)
                        .accessDeniedHandler(errors))
                .authorizeHttpRequests(authorize -> authorize
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // 로그인·로그아웃은 필터가 처리하므로 메서드까지 지정해 GET 요청이 닿지 않게 한다.
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login",
                                "/api/v1/auth/logout").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        // 메뉴, 홈, 뮤직박스 화면은 비로그인 손님도 본다.
                        .requestMatchers(HttpMethod.GET, "/api/v1/menus/**", "/api/v1/index/**",
                                "/api/v1/musicbox/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/my").authenticated()
                        // 장바구니, 주문, 곡 신청, 내 신청곡은 고객 계정만 쓴다. 관리자는 /api/v1/admin/**을 쓴다.
                        .requestMatchers("/api/v1/menus/*/cart/items", "/api/v1/cart/**", "/api/v1/orders/**",
                                "/api/v1/musicbox/**", "/api/v1/my/**").hasRole("CUSTOMER")
                        .anyRequest().denyAll())
                .addFilterBefore(new SessionMemberFilter(sessionMembers, errors, sessionCookies, contextRepository),
                        AuthorizationFilter.class);
        return http.build();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        HttpSessionSecurityContextRepository sessions = new HttpSessionSecurityContextRepository();
        // Login already requires the CSRF session; never recreate an authentication session after concurrent logout.
        sessions.setAllowSessionCreation(false);
        return new DelegatingSecurityContextRepository(new RequestAttributeSecurityContextRepository(),
                sessions);
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService, Passwords passwords) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        // Apply the signup password policy and fail safely on unsupported or damaged stored hashes.
        provider.setPasswordEncoder(new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return passwords.encode(rawPassword == null ? null : rawPassword.toString());
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return passwords.matches(rawPassword == null ? null : rawPassword.toString(), encodedPassword);
            }
        });
        return new ProviderManager(provider);
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource(
            @Value("${app.security.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
        List<String> origins = allowedOrigins.stream().map(String::strip).toList();
        if (origins.isEmpty() || origins.stream().anyMatch(String::isEmpty)) {
            throw new IllegalArgumentException("허용할 프론트 origin을 설정해 주세요.");
        }
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        configuration.validateAllowCredentials();
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
