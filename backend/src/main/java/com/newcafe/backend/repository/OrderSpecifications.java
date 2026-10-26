package com.newcafe.backend.repository;

import com.newcafe.backend.dto.orders.OrderSearchRequest;
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

    public static Specification<Order> adminSearch(OrderSearchRequest request) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request.status() != null) {
                predicates.add(builder.equal(root.get("status"), request.status()));
            }

            if (request.group() != null) {
                predicates.add("active".equals(request.group())
                        ? root.get("status").in("received", "preparing", "ready")
                        : builder.equal(root.get("status"), request.group()));
            }

            if (request.q() != null) {
                String pattern = "%" + escapeLike(request.q().toLowerCase(Locale.ROOT)) + "%";
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
