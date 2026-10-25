package com.newcafe.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.newcafe.backend.entity.menu.Menu;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.parser.Part;
import org.springframework.data.repository.query.parser.PartTree;

class MenuRepositoryTest {

    @Test
    void s19CategoryMenuCountIncludesArchivedMenus() throws Exception {
        String query = MenuRepository.class.getMethod("countByCategory").getAnnotation(Query.class).value();

        assertFalse(query.contains("archivedAt"));
    }

    @Test
    void s9SlugLookupExcludesArchivedMenus() {
        PartTree tree = new PartTree("findBySlugAndArchivedAtIsNull", Menu.class);

        assertEquals(List.of("slug", "archivedAt"), properties(tree));
    }

    private static List<String> properties(PartTree tree) {
        return tree.getParts().stream()
                .map(Part::getProperty)
                .map(property -> property.getSegment())
                .toList();
    }
}
