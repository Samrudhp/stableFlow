package com.stableflow.payment.events;

import java.time.Instant;
import java.util.UUID;

public record BlockchainTransactionFailed(
        UUID eventId,
        String eventType,
        int eventVersion,
        UUID paymentId,
        UUID correlationId,
        Instant timestamp,
        String reason) { }
