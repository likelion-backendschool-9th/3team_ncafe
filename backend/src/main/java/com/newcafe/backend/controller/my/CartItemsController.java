package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.dto.cartitems.CartItemResponse;
import com.newcafe.backend.service.my.CartItemsService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController("myCartItemsController")
@RequiredArgsConstructor
public class CartItemsController {

    private final CartItemsService cartItemsService;

    // 새 줄이면 201, 같은 메뉴·온도 줄에 합쳤으면 200
    @PostMapping("/api/v1/menus/{menuId}/cart/items")
    public ResponseEntity<CartItemResponse> add(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member,
            @PathVariable Long menuId,
            @Valid @RequestBody CartItemRequest request) {
        CartItemsService.Added added = cartItemsService.add(member.getId(), menuId, request);
        return ResponseEntity.status(added.created() ? HttpStatus.CREATED : HttpStatus.OK).body(added.item());
    }
}
