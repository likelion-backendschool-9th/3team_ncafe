package com.newcafe.backend.common.error;

import com.newcafe.backend.common.security.AuthenticationRequiredException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import com.newcafe.backend.common.error.OrderException;
import com.newcafe.backend.common.security.AuthenticationRequiredException;

@RestControllerAdvice
public class ApiExceptionHandler {


    @ExceptionHandler(OrderException.class)
    public ResponseEntity<ErrorResponse> handleOrderException(OrderException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND, CART_ITEM_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case MENU_UNAVAILABLE -> HttpStatus.UNPROCESSABLE_ENTITY;
        };
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(AuthenticationRequiredException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationRequired(AuthenticationRequiredException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("UNAUTHENTICATED", exception.getMessage()));
    }
    
    @ExceptionHandler(SignupException.class)
    public ResponseEntity<ErrorResponse> handleSignupException(SignupException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
            case EMAIL_ALREADY_EXISTS -> HttpStatus.CONFLICT;
        };

        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(CategoryException.class)
    public ResponseEntity<ErrorResponse> handleCategoryException(CategoryException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_ORDER -> HttpStatus.BAD_REQUEST;
        };

        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(SongException.class)
    public ResponseEntity<ErrorResponse> handleSongException(SongException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
        };

        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(MenuException.class)
    public ResponseEntity<ErrorResponse> handleMenuException(MenuException exception) {
        HttpStatus status = switch (exception.getReason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
        };

        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getReason().name(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값을 확인해 주세요.");

        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", message));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleInvalidRequest(Exception exception) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("INVALID_REQUEST", "요청 값을 확인해 주세요."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintConflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("CONFLICT", "다른 변경과 충돌했습니다. 새로고침 후 다시 시도해 주세요."));
    }

    @ExceptionHandler(AuthenticationRequiredException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationRequired(AuthenticationRequiredException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("UNAUTHENTICATED", exception.getMessage()));
    }
}
