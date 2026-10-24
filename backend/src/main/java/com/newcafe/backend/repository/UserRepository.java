package com.newcafe.backend.repository;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    interface StatusCount {
        UserStatus getStatus();

        long getUserCount();
    }

    @Query("select u.status as status, count(u) as userCount from User u group by u.status")
    List<StatusCount> countByStatus();
}
