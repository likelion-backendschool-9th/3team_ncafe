package com.newcafe.backend.common.security;

import com.newcafe.backend.repository.UserRepository;

import java.util.Optional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionMemberService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<SessionUserDetails> findById(Long memberId) {
        return userRepository.findById(memberId).map(SessionUserDetails::forSession);
    }
}
