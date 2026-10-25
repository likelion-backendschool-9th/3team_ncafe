package com.newcafe.backend.controller.admin;

import com.newcafe.backend.common.error.OrderException;
import com.newcafe.backend.common.error.OrderException.Reason;
import com.newcafe.backend.dto.orders.AdminOrderResponse;
import com.newcafe.backend.dto.orders.ChangeOrderStatusRequest;
import com.newcafe.backend.dto.orders.OrderPageResponse;
import com.newcafe.backend.dto.orders.OrderSearchRequest;
import com.newcafe.backend.service.admin.OrdersService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("adminOrdersController")
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class OrdersController {
    private final OrdersService ordersService;

    @GetMapping
    public OrderPageResponse list(@Valid @ModelAttribute OrderSearchRequest request, HttpServletRequest http) {
        requireAdmin(http);
        return ordersService.list(request);
    }

    @GetMapping("/{id}")
    public AdminOrderResponse get(@PathVariable Long id, HttpServletRequest http) {
        requireAdmin(http);
        return ordersService.get(id);
    }

    @PutMapping("/status")
    public AdminOrderResponse changeStatus(@Valid @RequestBody ChangeOrderStatusRequest request,
            HttpServletRequest http) {
        requireAdmin(http);
        return ordersService.changeStatus(request);
    }

    private void requireAdmin(HttpServletRequest request) {
        if (request.getUserPrincipal() == null) {
            throw new OrderException(Reason.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        if (!request.isUserInRole("admin")) {
            throw new OrderException(Reason.FORBIDDEN, "관리자만 주문을 관리할 수 있습니다.");
        }
    }
}
