package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

public final class UserSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private UserSpecifications() {
    }

    public static Specification<User> adminSearch(String q, UserStatus status, UserRole role) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null) {
                String pattern = "%" + escapeLike(q.toLowerCase(Locale.ROOT)) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("name")), pattern, LIKE_ESCAPE),
                        builder.like(builder.lower(root.get("email")), pattern, LIKE_ESCAPE)
                ));
            }

            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }

            if (role != null) {
                predicates.add(builder.equal(root.get("role"), role));
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
