package com.stableflow.payment.events;

import java.time.Instant;
import java.util.UUID;

import com.stableflow.payment.domain.PaymentStatus;

public record PaymentStatusChanged(
        UUID eventId,
        String eventType,
        int eventVersion,
        UUID paymentId,
        UUID correlationId,
        Instant timestamp,
        PaymentStatus status,
        String transactionHash) { }
