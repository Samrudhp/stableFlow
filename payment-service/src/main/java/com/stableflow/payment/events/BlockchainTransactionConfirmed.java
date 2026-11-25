package com.stableflow.payment.events;

import java.time.Instant;
import java.util.UUID;

public record BlockchainTransactionConfirmed(
        UUID eventId,
        String eventType,
        int eventVersion,
        UUID paymentId,
        UUID correlationId,
        Instant timestamp,
        String transactionHash) { }
