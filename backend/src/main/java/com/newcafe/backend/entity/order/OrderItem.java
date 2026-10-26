package com.newcafe.backend.entity.order;

import com.newcafe.backend.entity.menu.Menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id", nullable = false)
    private Menu menu;

    @Column(name = "menu_name", nullable = false, length = 80)
    private String menuName;

    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;

    @Column(length = 10)
    private String temperature;

    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total", nullable = false)
    private int lineTotal;

    private OrderItem(Menu menu, String temperature, int quantity, int unitPrice, int lineTotal) {
        this.menu = menu;
        this.menuName = menu.getName();
        this.imageUrl = menu.getImageUrl();
        this.temperature = temperature;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lineTotal = lineTotal;
    }

    public static OrderItem snapshot(Menu menu, String temperature, int quantity, int unitPrice, int lineTotal) {
        return new OrderItem(menu, temperature, quantity, unitPrice, lineTotal);
    }

    void attachTo(Order order) {
        this.order = order;
    }
}
