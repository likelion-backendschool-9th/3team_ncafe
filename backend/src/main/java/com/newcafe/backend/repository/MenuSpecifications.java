package com.newcafe.backend.repository;

import com.newcafe.backend.entity.menu.Menu;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

public final class MenuSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private MenuSpecifications() {
    }

    public static Specification<Menu> adminSearch(String q, Long categoryId, Boolean available) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.isNull(root.get("archivedAt")));

            if (q != null) {
                String pattern = "%" + escapeLike(q.toLowerCase(Locale.ROOT)) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("name")), pattern, LIKE_ESCAPE),
                        builder.like(builder.lower(root.get("slug")), pattern, LIKE_ESCAPE)
                ));
            }

            if (categoryId != null) {
                predicates.add(builder.equal(root.get("category").get("id"), categoryId));
            }

            if (available != null) {
                predicates.add(builder.equal(root.get("available"), available));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
