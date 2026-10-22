package com.newcafe.backend.repository;

import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class MenuRepositoryTest {

    @Test
    void s19CategoryMenuCountIncludesArchivedMenus() throws Exception {
        String query = MenuRepository.class.getMethod("countByCategory").getAnnotation(Query.class).value();

        assertFalse(query.contains("archivedAt"));
    }
}
