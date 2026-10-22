package com.newcafe.backend.service;

import com.newcafe.backend.common.error.SignupException;
import com.newcafe.backend.common.error.SignupException.Reason;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.dto.auth.SignupRequest;
import com.newcafe.backend.dto.auth.SignupResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserFields;
import com.newcafe.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final Passwords passwords;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        if (request == null || request.password() == null || !request.password().equals(request.passwordConfirm())) {
            throw new SignupException(Reason.VALIDATION_ERROR, "비밀번호와 비밀번호 확인을 확인해 주세요.");
        }

        String email;
        try {
            email = UserFields.normalizeEmail(request.email());
        } catch (IllegalArgumentException exception) {
            throw new SignupException(Reason.VALIDATION_ERROR, exception.getMessage());
        }

        if (userRepository.existsByEmail(email)) {
            throw duplicateEmail();
        }

        User user;
        try {
            user = User.createCustomer(request.name(), email, passwords.encode(request.password()));
        } catch (IllegalArgumentException exception) {
            throw new SignupException(Reason.VALIDATION_ERROR, exception.getMessage());
        }

        try {
            return SignupResponse.from(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateEmail(exception)) {
                throw duplicateEmail();
            }
            throw exception;
        }
    }

    private static boolean isDuplicateEmail(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraint
                    && "uk_users_email".equals(constraint.getConstraintName())) {
                return true;
            }
        }
        return false;
    }

    private static SignupException duplicateEmail() {
        return new SignupException(Reason.EMAIL_ALREADY_EXISTS, "이미 가입된 이메일입니다.");
    }
}
