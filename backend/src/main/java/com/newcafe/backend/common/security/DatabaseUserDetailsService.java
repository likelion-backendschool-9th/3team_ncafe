package com.newcafe.backend.common.security;

import com.newcafe.backend.entity.user.UserFields;
import com.newcafe.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public SessionUserDetails loadUserByUsername(String username) {
        String email;
        try {
            email = UserFields.normalizeEmail(username);
        } catch (IllegalArgumentException exception) {
            throw userNotFound();
        }

        return userRepository.findByEmail(email)
                .map(SessionUserDetails::from)
                .orElseThrow(DatabaseUserDetailsService::userNotFound);
    }

    private static UsernameNotFoundException userNotFound() {
        return new UsernameNotFoundException("Invalid credentials");
    }
}
