package com.stableflow.payment.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BlockchainTransactionRequested(
        UUID eventId,
        String eventType,
        int eventVersion,
        UUID paymentId,
        UUID correlationId,
        Instant timestamp,
        UUID senderWalletId,
        UUID receiverWalletId,
        BigDecimal amount,
        String currency) { }
