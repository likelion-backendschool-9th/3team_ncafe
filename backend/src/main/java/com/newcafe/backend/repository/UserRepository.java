package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    interface StatusCount {
        UserStatus getStatus();

        long getUserCount();
    }

    // Normalize lookup values with UserFields.normalizeEmail before calling these methods.
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("select u.status as status, count(u) as userCount from User u group by u.status")
    List<StatusCount> countByStatus();
}
