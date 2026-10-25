package com.newcafe.backend.common.error;

import com.newcafe.backend.controller.admin.OrdersController;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = OrdersController.class)
public class AdminOrdersExceptionHandler {
    @ExceptionHandler(AdminOrderException.class)
    public ResponseEntity<ErrorResponse> handleOrderException(AdminOrderException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_STATUS, STALE_STATUS -> HttpStatus.CONFLICT;
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
        };
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticConflict(OptimisticLockingFailureException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("STALE_STATUS", "주문 상태가 변경되었습니다. 새로고침해 주세요."));
    }
}
