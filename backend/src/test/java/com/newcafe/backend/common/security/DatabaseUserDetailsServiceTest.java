package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

class DatabaseUserDetailsServiceTest {

    private static final String HASH = "{bcrypt}$2a$10$" + "a".repeat(53);
    private UserRepository userRepository;
    private DatabaseUserDetailsService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        service = new DatabaseUserDetailsService(userRepository);
    }

    @Test
    void findsNormalizedEmailAndReturnsIndependentPrincipalOnEachLoad() {
        User user = customer();
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));

        SessionUserDetails first = service.loadUserByUsername("\u2003Member@EXAMPLE.COM\u2003");
        first.eraseCredentials();
        SessionUserDetails second = service.loadUserByUsername("member@example.com");

        assertNotSame(first, second);
        assertEquals(10L, second.getId());
        assertEquals("member@example.com", second.getUsername());
        assertEquals(HASH, second.getPassword());
        assertEquals(HASH, user.getPasswordHash());
    }

    @Test
    void missingEmailProducesGenericFailureWithoutExposingEmail() {
        var failure = assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("unknown@example.com"));

        assertEquals("Invalid credentials", failure.getMessage());
        assertFalse(failure.getMessage().contains("unknown@example.com"));
        verify(userRepository).findByEmail("unknown@example.com");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "not-an-email", "member@example", "member @example.com"})
    void invalidEmailProducesSameGenericFailureWithoutQueryingDatabase(String email) {
        var failure = assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername(email));

        assertEquals("Invalid credentials", failure.getMessage());
        verifyNoInteractions(userRepository);
    }

    @Test
    void returnsSuspendedAccountAsDisabledForAuthenticationProvider() {
        User user = customer();
        ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED);
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));

        SessionUserDetails principal = service.loadUserByUsername("member@example.com");

        assertEquals(UserStatus.SUSPENDED, principal.getStatus());
        assertFalse(principal.isEnabled());
    }

    private static User customer() {
        User user = User.createCustomer("단골 고객", "member@example.com", HASH);
        ReflectionTestUtils.setField(user, "id", 10L);
        return user;
    }
}
