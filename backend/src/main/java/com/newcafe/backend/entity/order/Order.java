package com.newcafe.backend.entity.order;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_customer_created", columnList = "customer_id, created_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_orders_customer_idempotency", columnNames = {"customer_id", "idempotency_key"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order {

    public static final String RECEIVED = "received";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "customer_name_snapshot", nullable = false, length = 80)
    private String customerNameSnapshot;

    @Column(name = "order_type", nullable = false, length = 20)
    private String orderType;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    @Column(length = 100)
    private String request;

    @Column(nullable = false, length = 20)
    private String status = RECEIVED;

    @Column(name = "total_amount", nullable = false)
    private int totalAmount;

    @Column(name = "status_version", nullable = false)
    private int statusVersion = 0;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "request_fingerprint", nullable = false, length = 64)
    private String requestFingerprint;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    private Order(Long customerId, String customerNameSnapshot, String orderType, String paymentMethod,
            String request, int totalAmount, String idempotencyKey, String requestFingerprint) {
        this.customerId = Objects.requireNonNull(customerId);
        this.customerNameSnapshot = Objects.requireNonNull(customerNameSnapshot);
        this.orderType = Objects.requireNonNull(orderType);
        this.paymentMethod = Objects.requireNonNull(paymentMethod);
        this.request = request;
        this.totalAmount = totalAmount;
        this.idempotencyKey = Objects.requireNonNull(idempotencyKey);
        this.requestFingerprint = Objects.requireNonNull(requestFingerprint);
    }

    public static Order create(Long customerId, String customerName, String orderType, String paymentMethod,
            String request, int totalAmount, String idempotencyKey, String requestFingerprint) {
        return new Order(customerId, customerName, orderType, paymentMethod, request, totalAmount,
                idempotencyKey, requestFingerprint);
    }

    public void addItem(OrderItem item) {
        items.add(Objects.requireNonNull(item));
        item.attachTo(this);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }
}
