package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.repository.CategoryRepository;

import java.sql.SQLException;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
class BackendDatabaseIntegrationTest {

    @Autowired
    private PostgreSQLContainer postgres;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private CategoryRepository categoryRepository;

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
