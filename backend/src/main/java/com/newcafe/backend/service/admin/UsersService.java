package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.UserException;
import com.newcafe.backend.common.error.UserException.Reason;
import com.newcafe.backend.dto.users.UpdateUserStatusRequest;
import com.newcafe.backend.dto.users.UserPageResponse;
import com.newcafe.backend.dto.users.UserResponse;
import com.newcafe.backend.dto.users.UserSearchRequest;
import com.newcafe.backend.dto.users.UserSummaryResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.repository.UserSpecifications;

import java.util.EnumMap;
import java.util.Map;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminUsersService")
@RequiredArgsConstructor
public class UsersService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserPageResponse list(UserSearchRequest request) {
        PageRequest pageRequest = PageRequest.of(request.page(), request.size(), toSort(request.sort()));

        return UserPageResponse.from(userRepository.findAll(
                UserSpecifications.adminSearch(request.q(), request.statusFilter(), request.roleFilter()), pageRequest));
    }

    @Transactional(readOnly = true)
    public UserSummaryResponse summary() {
        Map<UserStatus, Long> counts = new EnumMap<>(UserStatus.class);
        userRepository.countByStatus()
                .forEach(count -> counts.put(count.getStatus(), count.getUserCount()));

        long active = counts.getOrDefault(UserStatus.ACTIVE, 0L);
        long suspended = counts.getOrDefault(UserStatus.SUSPENDED, 0L);

        return new UserSummaryResponse(active + suspended, active, suspended);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return UserResponse.from(findUser(id));
    }

    @Transactional
    public UserResponse changeStatus(Long id, UpdateUserStatusRequest request) {
        User user = findUser(id);

        user.changeStatus(request.toStatus());

        return UserResponse.from(user);
    }

    private Sort toSort(String sort) {
        return switch (sort) {
            case "email" -> Sort.by(Sort.Order.asc("email"), Sort.Order.asc("id"));
            default -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
        };
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserException(Reason.NOT_FOUND, "회원을 찾을 수 없습니다."));
    }
}
