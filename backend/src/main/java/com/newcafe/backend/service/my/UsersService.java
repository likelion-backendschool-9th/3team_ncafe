package com.newcafe.backend.service.my;

import com.newcafe.backend.common.error.UserException;
import com.newcafe.backend.common.error.UserException.Reason;
import com.newcafe.backend.dto.users.UserResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("myUsersService")
@RequiredArgsConstructor
public class UsersService {

    private final UserRepository userRepository;

    // 인증 청사진(/my) 계약: 고객·관리자 모두 본인 정보를 받고, 없는 회원은 401, 정지 회원은 403이다.
    @Transactional(readOnly = true)
    public UserResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(Reason.UNAUTHORIZED, "로그인이 필요합니다."));

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new UserException(Reason.FORBIDDEN, "이용이 정지된 계정입니다.");
        }

        return UserResponse.from(user);
    }
}
