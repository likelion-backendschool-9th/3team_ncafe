package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import tools.jackson.databind.json.JsonMapper;

class SessionUserDetailsTest {

    private static final String HASH = "{bcrypt}$2a$10$" + "a".repeat(53);

    @Test
    void copiesCustomerIdentityAndMapsCustomerAuthority() {
        SessionUserDetails principal = SessionUserDetails.from(customer());

        assertEquals(10L, principal.getId());
        assertEquals("단골 고객", principal.getName());
        assertEquals("member@example.com", principal.getEmail());
        assertEquals(principal.getEmail(), principal.getUsername());
        assertEquals(UserRole.CUSTOMER, principal.getRole());
        assertEquals(UserStatus.ACTIVE, principal.getStatus());
        assertEquals(List.of("ROLE_CUSTOMER"), principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList());
        assertTrue(principal.isEnabled());
    }

    @Test
    void mapsAdminAuthorityAndDisablesSuspendedAccounts() {
        User user = customer();
        ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED);

        SessionUserDetails principal = SessionUserDetails.from(user);

        assertEquals(List.of("ROLE_ADMIN"), principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList());
        assertFalse(principal.isEnabled());
    }

    @Test
    void erasesPrincipalCredentialsWithoutChangingStoredUserOrIdentity() {
        User user = customer();
        SessionUserDetails principal = SessionUserDetails.from(user);
        assertEquals(HASH, principal.getPassword());

        principal.eraseCredentials();
        principal.eraseCredentials();

        assertNull(principal.getPassword());
        assertEquals(HASH, user.getPasswordHash());
        assertEquals(10L, principal.getId());
        assertEquals("member@example.com", principal.getUsername());
        assertTrue(principal.isEnabled());
    }

    @Test
    void jsonAndToStringNeverExposePasswordHashBeforeCredentialErasure() {
        SessionUserDetails principal = SessionUserDetails.from(customer());
        String json = JsonMapper.builder().build().writeValueAsString(principal);

        assertFalse(json.contains("password"));
        assertFalse(json.contains(HASH));
        assertFalse(principal.toString().contains(HASH));
    }

    @Test
    void sessionSerializationPreservesIdentityWithoutPersistingCredentials() throws Exception {
        SessionUserDetails principal = SessionUserDetails.from(customer());
        var bytes = new ByteArrayOutputStream();
        try (var output = new ObjectOutputStream(bytes)) {
            output.writeObject(principal);
        }
        assertFalse(bytes.toString(StandardCharsets.ISO_8859_1).contains(HASH));

        try (var input = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            SessionUserDetails restored = (SessionUserDetails) input.readObject();
            assertNull(restored.getPassword());
            assertEquals(principal.getId(), restored.getId());
            assertEquals(principal.getUsername(), restored.getUsername());
            assertEquals(principal.getAuthorities(), restored.getAuthorities());
            assertTrue(restored.isEnabled());
        }
    }

    private static User customer() {
        User user = User.createCustomer("단골 고객", "member@example.com", HASH);
        ReflectionTestUtils.setField(user, "id", 10L);
        return user;
    }
}
