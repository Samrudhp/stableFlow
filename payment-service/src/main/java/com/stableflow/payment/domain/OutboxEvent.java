package com.stableflow.payment.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id private UUID id;
    @Column(nullable = false, length = 120) private String routingKey;
    @Column(nullable = false, columnDefinition = "text") private String payload;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private boolean published;
    protected OutboxEvent() { }
    public OutboxEvent(String routingKey, String payload) {
        this.id = UUID.randomUUID(); this.routingKey = routingKey; this.payload = payload;
        this.createdAt = Instant.now(); this.published = false;
    }
    public UUID getId() { return id; }
    public String getRoutingKey() { return routingKey; }
    public String getPayload() { return payload; }
    public boolean isPublished() { return published; }
    public void markPublished() { published = true; }
}
