package com.newcafe.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.entity.Category;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import java.util.Set;
import java.util.stream.Collectors;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.mapping.Table;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class PluralTableNamingStrategyTest {

    @Test
    void categoryMapsToDesignedTableAndColumns() {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.implicit_naming_strategy", PluralTableNamingStrategy.class.getName())
                .applySetting("hibernate.physical_naming_strategy",
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .build();

        try {
            var metadata = new MetadataSources(registry)
                    .addAnnotatedClass(Category.class)
                    .addAnnotatedClass(Menu.class)
                    .buildMetadata();
            Table table = metadata.getEntityBinding(Category.class.getName()).getTable();
            Table menuTable = metadata.getEntityBinding(Menu.class.getName()).getTable();

            Set<String> columnNames = table.getColumns().stream()
                    .map(column -> column.getName())
                    .collect(Collectors.toSet());

            assertEquals("categories", table.getName());
            assertEquals(Set.of("id", "name", "display_order", "is_fallback", "created_at", "updated_at"),
                    columnNames);
            assertTrue(table.getColumn(org.hibernate.boot.model.naming.Identifier.toIdentifier("name")).isUnique());
            assertTrue(table.getColumn(org.hibernate.boot.model.naming.Identifier.toIdentifier("display_order")).isUnique());
            assertEquals("menus", menuTable.getName());
            assertTrue(menuTable.getColumns().stream().anyMatch(column -> column.getName().equals("category_id")));
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    @Test
    void repositoryQueriesUseMappedEntityProperties() throws Exception {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .build();

        try (var sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(Category.class)
                .addAnnotatedClass(Menu.class)
                .buildMetadata()
                .buildSessionFactory()) {
            var entityManager = sessionFactory.createEntityManager();
            try {
                String fallbackQuery = CategoryRepository.class.getMethod("findFallback")
                        .getAnnotation(Query.class).value();
                String menuMoveQuery = MenuRepository.class.getMethod("moveToCategory", Category.class, Category.class)
                        .getAnnotation(Query.class).value();
                String menuCountQuery = MenuRepository.class.getMethod("countByCategory")
                        .getAnnotation(Query.class).value();
                entityManager.createQuery(fallbackQuery);
                entityManager.createQuery(menuMoveQuery);
                entityManager.createQuery(menuCountQuery);
            } finally {
                entityManager.close();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }
}
