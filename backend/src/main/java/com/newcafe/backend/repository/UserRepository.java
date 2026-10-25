package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // 장바구니 변경은 회원 행을 잠가 같은 회원의 요청을 한 순서로 적용한다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select target from User target where target.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
