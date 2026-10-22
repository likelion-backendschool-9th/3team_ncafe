package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.UserRepository;

import java.sql.SQLException;
import java.time.Instant;

import javax.sql.DataSource;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;

import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
@Transactional
class BackendDatabaseIntegrationTest {

    @Autowired
    private PostgreSQLContainer postgres;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Passwords passwords;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JsonMapper jsonMapper;

    @Test
    void startsApplicationWithIsolatedPostgreSqlAndFallbackCategory() throws SQLException {
        try (var connection = dataSource.getConnection()) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
            assertEquals("ncafe_test", connection.getCatalog());
            assertEquals(postgres.getJdbcUrl(), connection.getMetaData().getURL());
        }

        assertEquals(1L, categoryRepository.count());
        assertEquals(Category.FALLBACK_NAME, categoryRepository.findFallback().orElseThrow().getName());
    }

    @Test
    void persistsNormalizedCustomerWithPasswordHashAndTimestamps() {
        String rawPassword = "비밀번호123! ";
        String passwordHash = passwords.encode(rawPassword);
        Instant beforeSave = Instant.now();
        User user = userRepository.saveAndFlush(
                User.createCustomer("  홍길동  ", "  Member@Example.COM  ", passwordHash));
        entityManager.clear();

        User persisted = userRepository.findByEmail("member@example.com").orElseThrow();
        assertEquals(user.getId(), persisted.getId());
        assertEquals("홍길동", persisted.getName());
        assertEquals("member@example.com", persisted.getEmail());
        assertEquals(UserRole.CUSTOMER, persisted.getRole());
        assertEquals(UserStatus.ACTIVE, persisted.getStatus());
        assertTrue(userRepository.existsByEmail("member@example.com"));
        assertNotNull(persisted.getCreatedAt());
        assertEquals(persisted.getCreatedAt(), persisted.getUpdatedAt());
        assertFalse(persisted.getCreatedAt().isBefore(beforeSave));
        assertFalse(persisted.getCreatedAt().isAfter(Instant.now()));
        assertEquals(passwordHash, persisted.getPasswordHash());
        assertNotEquals(rawPassword, persisted.getPasswordHash());
        assertTrue(passwords.matches(rawPassword, persisted.getPasswordHash()));
        assertFalse(passwords.matches(rawPassword.strip(), persisted.getPasswordHash()));

        var columns = jdbcTemplate.queryForMap(
                "select role, status, password_hash from users where id = ?", persisted.getId());
        assertEquals("customer", columns.get("role"));
        assertEquals("active", columns.get("status"));
        assertEquals(passwordHash, columns.get("password_hash"));

        String json = jsonMapper.writeValueAsString(persisted);
        assertFalse(json.contains("password"));
        assertFalse(json.contains(passwordHash));
        assertFalse(json.contains(rawPassword));
    }

    @Test
    void rejectsNormalizedDuplicateEmailWithNamedDatabaseConstraint() {
        String passwordHash = passwords.encode("password123!");
        userRepository.saveAndFlush(User.createCustomer("첫 회원", "Member@Example.COM", passwordHash));

        var failure = assertThrows(DataIntegrityViolationException.class, () ->
                userRepository.saveAndFlush(
                        User.createCustomer("다른 회원", "  member@example.com  ", passwordHash)));

        assertTrue(failure.getMostSpecificCause().getMessage().contains("uk_users_email"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"role", "status"})
    void rejectsInvalidEnumValuesAtDatabaseLevel(String column) {
        User user = userRepository.saveAndFlush(
                User.createCustomer("홍길동", "member@example.com", passwords.encode("password123!")));

        var failure = assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("update users set " + column + " = ? where id = ?", "invalid", user.getId()));

        SQLException sqlFailure = (SQLException) failure.getMostSpecificCause();
        assertEquals("23514", sqlFailure.getSQLState());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class DatabaseConfiguration {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer("postgres:16-alpine")
                    .withDatabaseName("ncafe_test")
                    .withUsername("ncafe_test")
                    .withPassword("ncafe_test")
                    .withReuse(false);
        }
    }
}
