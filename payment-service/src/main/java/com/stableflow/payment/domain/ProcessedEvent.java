package com.stableflow.payment.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "processed_events")
public class ProcessedEvent {
    @Id private UUID eventId;
    private Instant processedAt;
    protected ProcessedEvent() { }
    public ProcessedEvent(UUID eventId) { this.eventId = eventId; this.processedAt = Instant.now(); }
}
