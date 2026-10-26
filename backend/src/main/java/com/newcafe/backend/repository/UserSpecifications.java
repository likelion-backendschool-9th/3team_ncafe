package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.hibernate.query.criteria.HibernateCriteriaBuilder;
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

    // DB 기본 정렬 규칙(en_US 등)은 한글을 가나다순으로 정렬하지 못하고 이메일의 기호를 무시한다.
    // 이미 만들어진 users 테이블에도 적용되도록 컬럼이 아니라 정렬 쿼리에서 "C"(코드 순서)를 지정한다.
    public static Specification<User> adminOrder(String sort) {
        return (root, query, builder) -> {
            // 페이지 전체 개수를 세는 쿼리에는 정렬을 붙이지 않는다.
            if (query != null && !Long.class.equals(query.getResultType())) {
                Expression<String> key = root.get("email".equals(sort) ? "email" : "name");
                query.orderBy(
                        builder.asc(((HibernateCriteriaBuilder) builder).collate(key, "\"C\"")),
                        builder.asc(root.get("id")));
            }

            return null;
        };
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
