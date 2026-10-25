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
    @JoinColumn(nullable = false, updatable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(nullable = false, updatable = false)
    private Menu menu;

    @Column(nullable = false, updatable = false, length = 80)
    private String menuName;

    @Column(nullable = false, updatable = false, length = 2048)
    private String imageUrl;

    @Column(updatable = false, length = 4)
    private String temperature;

    @Column(nullable = false, updatable = false)
    private int quantity;

    @Column(nullable = false, updatable = false)
    private int unitPrice;

    @Column(nullable = false, updatable = false)
    private int lineTotal;

    public static OrderItem snapshot(Menu menu, String temperature, int quantity) {
        if (menu == null || menu.isArchived() || !menu.isAvailable() || quantity < 1 || quantity > 20) {
            throw new IllegalArgumentException("주문 가능한 메뉴와 수량을 확인해 주세요.");
        }

        boolean validTemperature = temperature == null
                ? !menu.isSupportsHot() && !menu.isSupportsIced()
                : ("hot".equals(temperature) && menu.isSupportsHot())
                    || ("iced".equals(temperature) && menu.isSupportsIced());
        if (!validTemperature) {
            throw new IllegalArgumentException("메뉴 온도 옵션을 확인해 주세요.");
        }

        OrderItem item = new OrderItem();
        item.menu = menu;
        item.menuName = menu.getName();
        item.imageUrl = menu.getImageUrl();
        item.temperature = temperature;
        item.quantity = quantity;
        item.unitPrice = menu.getPrice();
        item.lineTotal = Math.multiplyExact(quantity, item.unitPrice);

        return item;
    }

    void attachTo(Order order) {
        if (this.order != null) {
            throw new IllegalArgumentException("이미 주문에 포함된 품목입니다.");
        }

        this.order = order;
    }
}
