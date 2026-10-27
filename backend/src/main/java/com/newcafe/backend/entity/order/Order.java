package com.newcafe.backend.entity.order;

import com.newcafe.backend.common.error.AdminOrderException.Reason;
import com.newcafe.backend.common.error.AdminOrderException;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.Check;

@Entity
@Check(constraints = "status in ('received','preparing','ready','completed','canceled') "
        + "and order_type in ('dine-in','takeout') and payment_method in ('card','cash') "
        + "and total_amount >= 0 and status_version >= 0")
@Table(indexes = {
        @Index(name = "idx_orders_customer_created", columnList = "customer_id, created_at"),
        @Index(name = "idx_orders_status_created", columnList = "status, created_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_orders_customer_idempotency", columnNames = {"customer_id", "idempotency_key"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order {

    public static final String RECEIVED = "received";
    public static final String STATUS_PATTERN = "received|preparing|ready|completed|canceled";
    // 관리자 주문 목록의 "진행 중" 그룹
    public static final List<String> ACTIVE_STATUSES = List.of("received", "preparing", "ready");
    private static final List<String> PROGRESS = List.of("received", "preparing", "ready", "completed");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 80)
    private String customerNameSnapshot;

    @Column(nullable = false, length = 20)
    private String orderType;

    @Column(nullable = false, length = 20)
    private String paymentMethod;

    @Column(length = 100)
    private String request;

    @Column(nullable = false, length = 20)
    private String status = RECEIVED;

    @Column(nullable = false)
    private int totalAmount;

    @Version
    @Column(nullable = false)
    private int statusVersion = 0;

    @Column(nullable = false, length = 100)
    private String idempotencyKey;

    @Column(nullable = false, length = 64)
    private String requestFingerprint;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    @Getter(AccessLevel.NONE)
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
        if (id != null) {
            throw new IllegalStateException("저장된 주문의 품목은 변경할 수 없습니다.");
        }
        Objects.requireNonNull(item);
        item.attachTo(this);
        items.add(item);
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public List<String> allowedStatuses() {
        int index = PROGRESS.indexOf(status);
        if (index < 0) {
            return List.of();
        }
        List<String> allowed = new ArrayList<>();
        if (index > 0) {
            allowed.add(PROGRESS.get(index - 1));
        }
        if (index < PROGRESS.size() - 1) {
            allowed.add(PROGRESS.get(index + 1));
        }
        if (index == 0) {
            allowed.add("canceled");
        }
        return List.copyOf(allowed);
    }

    public void changeStatus(String expectedStatus, Integer expectedVersion, String nextStatus) {
        if (!Objects.equals(status, expectedStatus) || !Objects.equals(statusVersion, expectedVersion)) {
            throw new AdminOrderException(Reason.STALE_STATUS, "주문 상태가 변경되었습니다. 새로고침해 주세요.");
        }
        if (!allowedStatuses().contains(nextStatus)) {
            throw new AdminOrderException(Reason.INVALID_STATUS, "현재 상태에서 변경할 수 없는 주문 상태입니다.");
        }

        status = nextStatus;
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }
}
