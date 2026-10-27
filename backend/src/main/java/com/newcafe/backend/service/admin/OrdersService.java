package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.AdminOrderException;
import com.newcafe.backend.common.error.AdminOrderException.Reason;
import com.newcafe.backend.dto.orders.AdminOrderResponse;
import com.newcafe.backend.dto.orders.ChangeOrderStatusRequest;
import com.newcafe.backend.dto.orders.AdminOrderPageResponse;
import com.newcafe.backend.dto.orders.OrderSearchRequest;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.repository.OrderRepository;
import com.newcafe.backend.repository.OrderSpecifications;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminOrdersService")
@RequiredArgsConstructor
public class OrdersService {
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public AdminOrderPageResponse list(OrderSearchRequest request) {
        Sort.Direction direction = "oldest".equals(request.sort()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        var spec = OrderSpecifications.adminSearch(request.q(), request.status(), request.group());
        var page = orderRepository.findAll(spec,
                PageRequest.of(request.page(), request.size(), Sort.by(direction, "createdAt", "id")));

        // 컬렉션 fetch join을 페이지 쿼리에 넣으면 메모리에서 페이지를 자르게 되므로 분리한다.
        Map<Long, Order> orders = page.isEmpty() ? Map.of() : orderRepository.findWithItemsByIdIn(
                page.getContent().stream().map(Order::getId).toList()).stream()
                .collect(Collectors.toMap(Order::getId, Function.identity()));

        return new AdminOrderPageResponse(page.getContent().stream()
                .map(order -> AdminOrderResponse.from(orders.get(order.getId()))).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse get(Long id) {
        return AdminOrderResponse.from(findOrder(id));
    }

    @Transactional
    public AdminOrderResponse changeStatus(ChangeOrderStatusRequest request) {
        Order order = findOrder(request.id());
        order.changeStatus(request.expectedStatus(), request.statusVersion(), request.nextStatus(), request.cancelReason());

        // 응답에 증가한 @Version을 담고, 동시 갱신 충돌을 성공 응답 전에 감지한다.
        orderRepository.flush();

        return AdminOrderResponse.from(order);
    }

    private Order findOrder(Long id) {
        return orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new AdminOrderException(Reason.NOT_FOUND, "주문을 찾을 수 없습니다."));
    }
}
