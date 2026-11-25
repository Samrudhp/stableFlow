package com.stableflow.notification.events;

import java.time.Instant;
import java.util.UUID;

public record PaymentStatusChanged(UUID eventId, String eventType, int eventVersion, UUID paymentId,
                                   UUID correlationId, Instant timestamp, String status, String transactionHash) { }
