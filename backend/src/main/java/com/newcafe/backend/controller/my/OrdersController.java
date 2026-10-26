package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.dto.orders.CreateOrderRequest;
import com.newcafe.backend.dto.orders.OrderPageResponse;
import com.newcafe.backend.dto.orders.OrderResponse;
import com.newcafe.backend.service.my.OrdersService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController("myOrdersController")
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrdersController {

    private final OrdersService ordersService;
    private final CurrentUserContext currentUserContext;

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request) {
        var user = currentUserContext.requireCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ordersService.create(user.id(), user.displayName(), idempotencyKey, request));
    }

    @GetMapping
    public OrderPageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ordersService.list(currentUserContext.requireCurrentUser().id(), page, size);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return ordersService.get(currentUserContext.requireCurrentUser().id(), id);
    }
}
