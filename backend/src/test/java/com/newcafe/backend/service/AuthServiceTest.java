package com.newcafe.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.SignupException;
import com.newcafe.backend.common.error.SignupException.Reason;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.dto.auth.SignupRequest;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;

import java.sql.SQLException;
import java.util.stream.Stream;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import tools.jackson.databind.json.JsonMapper;

class AuthServiceTest {

    private static final String HASH = "{bcrypt}$2a$10$" + "a".repeat(53);
    private UserRepository userRepository;
    private Passwords passwords;
    private AuthService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwords = mock(Passwords.class);
        service = new AuthService(userRepository, passwords);
        when(passwords.encode(anyString())).thenReturn(HASH);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 10L);
            return user;
        });
    }

    @Test
    void createsNormalizedActiveCustomerAndReturnsOnlyPublicFields() {
        var response = service.signup(new SignupRequest("  단골 고객  ", " Member@EXAMPLE.COM ",
                " password123 ", " password123 "));

        assertEquals(10L, response.id());
        assertEquals("단골 고객", response.name());
        assertEquals("member@example.com", response.email());
        assertEquals(UserRole.CUSTOMER, response.role());
        assertEquals(UserStatus.ACTIVE, response.status());
        verify(userRepository).existsByEmail("member@example.com");
        verify(passwords).encode(" password123 ");
        String json = JsonMapper.builder().build().writeValueAsString(response);
        assertFalse(json.contains("password"));
        assertFalse(json.contains(HASH));
    }

    @Test
    void rejectsKnownDuplicateWithoutHashingOrSaving() {
        when(userRepository.existsByEmail("member@example.com")).thenReturn(true);

        var failure = assertThrows(SignupException.class, () -> service.signup(validRequest()));

        assertEquals(Reason.EMAIL_ALREADY_EXISTS, failure.getReason());
        verifyNoInteractions(passwords);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void mapsNamedEmailConstraintFromConcurrentInsertToDuplicate() {
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(constraintFailure("uk_users_email"));

        var failure = assertThrows(SignupException.class, () -> service.signup(validRequest()));

        assertEquals(Reason.EMAIL_ALREADY_EXISTS, failure.getReason());
    }

    @Test
    void doesNotRemapUnrelatedDatabaseConstraintEvenWhenMessageMentionsEmailConstraint() {
        var original = constraintFailure("other_constraint");
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(original);

        var failure = assertThrows(DataIntegrityViolationException.class, () -> service.signup(validRequest()));

        assertSame(original, failure);
    }

    @Test
    void doesNotRemapDatabaseFailureWithoutConstraintMetadata() {
        var original = new DataIntegrityViolationException("uk_users_email");
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(original);

        assertSame(original,
                assertThrows(DataIntegrityViolationException.class, () -> service.signup(validRequest())));
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidOrMismatchedRequestsWithoutSaving(SignupRequest request) {
        var failure = assertThrows(SignupException.class, () -> service.signup(request));

        assertEquals(Reason.VALIDATION_ERROR, failure.getReason());
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    static Stream<SignupRequest> invalidRequests() {
        return Stream.of(null,
                new SignupRequest("단골", null, "password123", "password123"),
                new SignupRequest("단골", "invalid-email", "password123", "password123"),
                new SignupRequest(null, "member@example.com", "password123", "password123"),
                new SignupRequest("😀", "member@example.com", "password123", "password123"),
                new SignupRequest("단골", "member@example.com", null, null),
                new SignupRequest("단골", "member@example.com", "password123", null),
                new SignupRequest("단골", "member@example.com", "password123", "different-password"),
                new SignupRequest("단골", "member@example.com", " password123 ", "password123"));
    }

    @Test
    void mapsPasswordValidationFailureWithoutSaving() {
        when(passwords.encode("short")).thenThrow(new IllegalArgumentException("비밀번호 길이를 확인해 주세요."));

        var failure = assertThrows(SignupException.class,
                () -> service.signup(new SignupRequest("단골", "member@example.com", "short", "short")));

        assertEquals(Reason.VALIDATION_ERROR, failure.getReason());
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void requestDeserializesPasswordsButDoesNotSerializeOrPrintThem() {
        JsonMapper mapper = JsonMapper.builder().build();
        SignupRequest request = mapper.readValue("""
                {"name":"단골","email":"member@example.com",
                 "password":"sensitive-password","passwordConfirm":"sensitive-confirmation"}
                """, SignupRequest.class);

        assertEquals("sensitive-password", request.password());
        assertEquals("sensitive-confirmation", request.passwordConfirm());
        String json = mapper.writeValueAsString(request);
        assertFalse(json.contains("password"));
        assertFalse(json.contains("sensitive"));
        assertFalse(request.toString().contains("sensitive"));
    }

    private static SignupRequest validRequest() {
        return new SignupRequest("단골", "member@example.com", "password123", "password123");
    }

    private static DataIntegrityViolationException constraintFailure(String constraintName) {
        var hibernateFailure = new ConstraintViolationException("uk_users_email", new SQLException("rejected", "23505"),
                constraintName);
        return new DataIntegrityViolationException("write rejected", new IllegalStateException(hibernateFailure));
    }
}
