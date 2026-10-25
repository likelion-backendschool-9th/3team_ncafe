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

import org.hibernate.annotations.Check;

@Entity
@Check(constraints = "quantity > 0 and unit_price >= 0 and line_total = quantity * unit_price "
        + "and (temperature is null or temperature in ('hot','iced'))")
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
        if (menu == null || menu.isArchived() || !menu.isAvailable() || quantity < 1 || quantity > 20
                || unitPrice < 0 || lineTotal != Math.multiplyExact(quantity, unitPrice)) {
            throw new IllegalArgumentException("주문 품목 정보를 확인해 주세요.");
        }
        boolean validTemperature = temperature == null
                ? !menu.isSupportsHot() && !menu.isSupportsIced()
                : ("hot".equals(temperature) && menu.isSupportsHot())
                    || ("iced".equals(temperature) && menu.isSupportsIced());
        if (!validTemperature) {
            throw new IllegalArgumentException("메뉴 온도 옵션을 확인해 주세요.");
        }
        return new OrderItem(menu, temperature, quantity, unitPrice, lineTotal);
    }

    void attachTo(Order order) {
        if (this.order != null) {
            throw new IllegalArgumentException("이미 주문에 포함된 품목입니다.");
        }
        this.order = order;
    }
}
