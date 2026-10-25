package com.newcafe.backend.repository;

import java.util.Optional;

import com.newcafe.backend.entity.order.Order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query(value = "select pg_advisory_xact_lock(:lockId) is null", nativeQuery = true)
    boolean acquireIdempotencyLock(@Param("lockId") long lockId);

    Optional<Order> findByCustomerIdAndIdempotencyKey(Long customerId, String idempotencyKey);

    Page<Order> findAllByCustomerId(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findByIdAndCustomerId(Long id, Long customerId);
}
