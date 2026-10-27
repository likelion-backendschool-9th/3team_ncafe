package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.dto.cartitems.CartItemQuantityRequest;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.dto.cartitems.CartItemResponse;
import com.newcafe.backend.dto.cartitems.CartItemsResponse;
import com.newcafe.backend.service.my.CartItemsService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("myCartItemsController")
@RequestMapping("/api/v1/cart/items")
@RequiredArgsConstructor
public class CartItemsController {

    private final CartItemsService cartItemsService;

    // 새 줄이면 201, 같은 메뉴·온도 줄에 합쳤으면 200
    @PostMapping
    public ResponseEntity<CartItemResponse> add(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member,
            @Valid @RequestBody CartItemRequest request) {
        CartItemsService.Added added = cartItemsService.add(member.getId(), request);
        return ResponseEntity.status(added.created() ? HttpStatus.CREATED : HttpStatus.OK).body(added.item());
    }

    @GetMapping
    public ResponseEntity<CartItemsResponse> list(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(cartItemsService.list(member.getId()));
    }

    @PutMapping("/{id}")
    public CartItemResponse changeQuantity(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member,
            @PathVariable Long id,
            @Valid @RequestBody CartItemQuantityRequest request) {
        return cartItemsService.changeQuantity(member.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(
            @AuthenticationPrincipal(errorOnInvalidType = true) SessionUserDetails member,
            @PathVariable Long id) {
        cartItemsService.remove(member.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
