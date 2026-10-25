package com.newcafe.backend.service.my;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import com.newcafe.backend.common.error.OrderException;
import com.newcafe.backend.common.error.OrderException.Reason;
import com.newcafe.backend.dto.orders.CreateOrderRequest;
import com.newcafe.backend.dto.orders.OrderPageResponse;
import com.newcafe.backend.dto.orders.OrderResponse;
import com.newcafe.backend.entity.cartitem.CartItem;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;
import com.newcafe.backend.repository.CartItemRepository;
import com.newcafe.backend.repository.OrderMenuRepository;
import com.newcafe.backend.repository.OrderRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("myOrdersService")
@RequiredArgsConstructor
public class OrdersService {

    private static final Pattern TEMPERATURE = Pattern.compile("hot|iced");
    private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("[\\x21-\\x7E]{1,100}");

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderMenuRepository menuRepository;

    @Transactional
    public OrderResponse create(Long customerId, String customerName, String idempotencyKey,
            CreateOrderRequest request) {
        validateRequest(customerId, customerName, idempotencyKey, request);
        long lockId = lockId(customerId, idempotencyKey);
        orderRepository.acquireIdempotencyLock(lockId);

        String fingerprint = fingerprint(request);
        var previous = orderRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);
        if (previous.isPresent()) {
            if (!previous.get().getRequestFingerprint().equals(fingerprint)) {
                throw new OrderException(Reason.CONFLICT,
                        "같은 Idempotency-Key를 다른 주문 내용에 사용할 수 없습니다.");
            }
            return OrderResponse.from(previous.get());
        }

        List<Long> uniqueIds = request.cartItemIds().stream().distinct().sorted().toList();
        List<CartItem> cartItems = cartItemRepository.findOwnedForUpdate(customerId, uniqueIds);
        if (cartItems.size() != uniqueIds.size()) {
            throw new OrderException(Reason.CART_ITEM_NOT_FOUND,
                    "선택한 장바구니 항목을 찾을 수 없거나 주문 권한이 없습니다.");
        }

        List<Long> menuIds = cartItems.stream().map(item -> item.getMenu().getId()).distinct().sorted().toList();
        Map<Long, Menu> menus = new HashMap<>();
        menuRepository.findAllForOrderUpdate(menuIds).forEach(menu -> menus.put(menu.getId(), menu));
        if (menus.size() != menuIds.size()) {
            throw new OrderException(Reason.MENU_UNAVAILABLE, "주문할 수 없는 메뉴가 포함되어 있습니다.");
        }

        List<OrderItem> snapshots = new ArrayList<>();
        int total = 0;
        for (CartItem cartItem : cartItems) {
            Menu menu = menus.get(cartItem.getMenu().getId());
            validateCartItem(cartItem, menu);
            int lineTotal;
            try {
                lineTotal = Math.multiplyExact(menu.getPrice(), cartItem.getQuantity());
                total = Math.addExact(total, lineTotal);
            } catch (ArithmeticException exception) {
                throw new OrderException(Reason.INVALID_INPUT, "주문 금액이 허용 범위를 초과했습니다.");
            }
            snapshots.add(OrderItem.snapshot(menu, cartItem.getTemperature(), cartItem.getQuantity(),
                    menu.getPrice(), lineTotal));
        }
        if (request.expectedTotalAmount() != null && request.expectedTotalAmount() != total) {
            throw new OrderException(Reason.CONFLICT, "메뉴 가격이 변경되었습니다. 금액을 확인한 뒤 다시 주문해 주세요.");
        }

        Order order = Order.create(customerId, customerName.trim(), request.orderType(), request.paymentMethod(),
                request.request(), total, idempotencyKey, fingerprint);
        snapshots.forEach(order::addItem);
        Order saved = orderRepository.saveAndFlush(order);
        cartItemRepository.deleteAllByIdInBatch(uniqueIds);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public OrderPageResponse list(Long customerId, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new OrderException(Reason.INVALID_INPUT, "페이지는 0 이상, 크기는 1~100으로 입력해 주세요.");
        }
        PageRequest pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return OrderPageResponse.from(orderRepository.findAllByCustomerId(customerId, pageable));
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long customerId, Long id) {
        return orderRepository.findByIdAndCustomerId(id, customerId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new OrderException(Reason.NOT_FOUND, "주문을 찾을 수 없습니다."));
    }

    private void validateRequest(Long customerId, String customerName, String key, CreateOrderRequest request) {
        if (customerId == null || customerId < 1 || customerName == null || customerName.isBlank()) {
            throw new OrderException(Reason.INVALID_INPUT, "로그인 회원 정보가 올바르지 않습니다.");
        }
        if (key == null || !IDEMPOTENCY_KEY.matcher(key).matches()) {
            throw new OrderException(Reason.INVALID_INPUT,
                    "Idempotency-Key 헤더는 출력 가능한 ASCII 문자 1~100자로 입력해 주세요.");
        }
        if (request == null || request.cartItemIds() == null || request.cartItemIds().isEmpty()) {
            throw new OrderException(Reason.INVALID_INPUT, "주문할 장바구니 항목을 선택해 주세요.");
        }
        if (new HashSet<>(request.cartItemIds()).size() != request.cartItemIds().size()) {
            throw new OrderException(Reason.INVALID_INPUT, "장바구니 항목 ID가 중복되었습니다.");
        }
        if (request.cartItemIds().stream().anyMatch(id -> id == null || id < 1)) {
            throw new OrderException(Reason.INVALID_INPUT, "장바구니 항목 ID는 1 이상의 정수여야 합니다.");
        }
        if (!"dine-in".equals(request.orderType()) && !"takeout".equals(request.orderType())) {
            throw new OrderException(Reason.INVALID_INPUT, "주문 유형은 dine-in 또는 takeout이어야 합니다.");
        }
        if (!"card".equals(request.paymentMethod()) && !"cash".equals(request.paymentMethod())) {
            throw new OrderException(Reason.INVALID_INPUT, "카운터 결제수단은 card 또는 cash이어야 합니다.");
        }
        if (request.request() != null && request.request().length() > 100) {
            throw new OrderException(Reason.INVALID_INPUT, "요청사항은 100자 이내로 입력해 주세요.");
        }
        if (request.expectedTotalAmount() != null && request.expectedTotalAmount() < 0) {
            throw new OrderException(Reason.INVALID_INPUT, "예상 금액은 0 이상이어야 합니다.");
        }
    }

    private void validateCartItem(CartItem item, Menu menu) {
        if (item.getQuantity() < 1 || item.getQuantity() > 20) {
            throw new OrderException(Reason.INVALID_INPUT, "장바구니 수량은 1~20개여야 합니다.");
        }
        if (!menu.isAvailable() || menu.isArchived()) {
            throw new OrderException(Reason.MENU_UNAVAILABLE, "판매 중지된 메뉴가 포함되어 있습니다.");
        }
        String temperature = item.getTemperature();
        if (temperature == null) {
            if (menu.isSupportsHot() || menu.isSupportsIced()) {
                throw new OrderException(Reason.INVALID_INPUT, "메뉴의 온도 옵션을 선택해 주세요.");
            }
        } else if (!TEMPERATURE.matcher(temperature).matches()
                || ("hot".equals(temperature) && !menu.isSupportsHot())
                || ("iced".equals(temperature) && !menu.isSupportsIced())) {
            throw new OrderException(Reason.INVALID_INPUT, "메뉴에서 지원하지 않는 온도 옵션입니다.");
        }
    }

    private String fingerprint(CreateOrderRequest request) {
        String ids = request.cartItemIds().stream().sorted().map(String::valueOf)
                .reduce((left, right) -> left + "," + right).orElse("");
        String canonical = ids + "|" + request.orderType() + "|" + request.paymentMethod() + "|"
                + (request.request() == null ? "" : request.request()) + "|" + request.expectedTotalAmount();
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private long lockId(Long customerId, String key) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((customerId + ":" + key).getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(hash).getLong();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
