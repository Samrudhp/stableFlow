package com.stableflow.notification.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.stableflow.notification.domain.Notification;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    boolean existsByPaymentIdAndStatus(UUID paymentId, String status);
    List<Notification> findAllByOrderByCreatedAtDesc();
}
