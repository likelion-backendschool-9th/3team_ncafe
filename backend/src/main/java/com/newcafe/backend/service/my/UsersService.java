package com.newcafe.backend.service.my;

import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsersService {

    private final UserRepository userRepository;

    public MemberResponse getCurrent(Long memberId) {
        return userRepository.findById(memberId).map(MemberResponse::from)
                .orElseThrow(() -> new UsernameNotFoundException("회원을 확인할 수 없습니다."));
    }
}
