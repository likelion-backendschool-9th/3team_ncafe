package com.newcafe.backend.common.error;

import com.newcafe.backend.controller.my.CartItemsController;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// 장바구니 오류만 여기서 처리한다. 입력 검증 등 공통 오류는 ApiExceptionHandler가 맡는다.
@RestControllerAdvice(assignableTypes = CartItemsController.class)
public class CartItemsExceptionHandler {

    @ExceptionHandler(CartItemException.class)
    public ResponseEntity<ErrorResponse> handleCartItemException(CartItemException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case MENU_UNAVAILABLE -> HttpStatus.UNPROCESSABLE_ENTITY;
        };

        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }
}
