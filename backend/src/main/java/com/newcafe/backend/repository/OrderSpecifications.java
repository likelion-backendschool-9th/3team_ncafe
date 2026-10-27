package com.newcafe.backend.repository;

import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.hibernate.query.criteria.JpaExpression;
import org.springframework.data.jpa.domain.Specification;

public final class OrderSpecifications {
    private OrderSpecifications() {
    }

    public static Specification<Order> adminSearch(String q, String status, String group) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }

            if (group != null) {
                predicates.add("active".equals(group)
                        ? root.get("status").in(Order.ACTIVE_STATUSES)
                        : builder.equal(root.get("status"), group));
            }

            if (q != null) {
                String pattern = "%" + escapeLike(q.toLowerCase(Locale.ROOT)) + "%";
                var itemQuery = query.subquery(Long.class);
                var item = itemQuery.from(OrderItem.class);
                itemQuery.select(item.get("id")).where(
                        builder.equal(item.get("order"), root),
                        builder.like(builder.lower(item.get("menuName")), pattern, '\\'));
                predicates.add(builder.or(
                        builder.like(((JpaExpression<Long>) root.<Long>get("id")).cast(String.class), pattern, '\\'),
                        builder.like(builder.lower(root.get("customerNameSnapshot")), pattern, '\\'),
                        builder.exists(itemQuery)));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
