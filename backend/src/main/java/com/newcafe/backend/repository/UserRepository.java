package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    // Normalize lookup values with UserFields.normalizeEmail before calling these methods.
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
