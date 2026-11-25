package com.stableflow.notification.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "notifications", uniqueConstraints = @UniqueConstraint(columnNames = {"payment_id", "status"}))
public class Notification {
    @Id private UUID id;
    @Column(name = "payment_id", nullable = false) private UUID paymentId;
    @Column(nullable = false, length = 32) private String status;
    @Column(nullable = false) private String message;
    @Column(nullable = false) private Instant createdAt;
    protected Notification() { }
    public Notification(UUID paymentId, String status, String message) {
        this.id = UUID.randomUUID(); this.paymentId = paymentId; this.status = status;
        this.message = message; this.createdAt = Instant.now();
    }
    public UUID getId() { return id; }
    public UUID getPaymentId() { return paymentId; }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
}
