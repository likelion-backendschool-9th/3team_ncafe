package com.newcafe.backend.entity.cartitem;

import com.newcafe.backend.entity.menu.Menu;

import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CartItem {

    public static final int MIN_QUANTITY = 1;
    public static final int MAX_QUANTITY = 20;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(nullable = false)
    private Menu menu;

    @Column(length = 10)
    private String temperature;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private CartItem(Long userId, Menu menu, String temperature, int quantity) {
        this.userId = Objects.requireNonNull(userId);
        this.menu = Objects.requireNonNull(menu);
        this.temperature = temperature;
        this.quantity = requireQuantity(quantity);
    }

    public static CartItem create(Long userId, Menu menu, String temperature, int quantity) {
        return new CartItem(userId, menu, temperature, quantity);
    }

    // 같은 메뉴·온도를 다시 담으면 합치고, 최대 수량을 넘으면 최대 수량으로 맞춘다.
    public void addQuantity(int quantity) {
        this.quantity = Math.min(MAX_QUANTITY, this.quantity + requireQuantity(quantity));
    }

    public void changeQuantity(int quantity) {
        this.quantity = requireQuantity(quantity);
    }

    public boolean isOrderable() {
        return menu.isAvailable() && !menu.isArchived();
    }

    private static int requireQuantity(int quantity) {
        if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
            throw new IllegalArgumentException("수량은 1~20개 사이로 입력해 주세요.");
        }

        return quantity;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
