package com.stableflow.blockchain.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class Events {
    private Events() { }
    public record Requested(UUID eventId, String eventType, int eventVersion, UUID paymentId, UUID correlationId,
                            Instant timestamp, UUID senderWalletId, UUID receiverWalletId,
                            BigDecimal amount, String currency) { }
    public record Confirmed(UUID eventId, String eventType, int eventVersion, UUID paymentId, UUID correlationId,
                            Instant timestamp, String transactionHash) { }
    public record Failed(UUID eventId, String eventType, int eventVersion, UUID paymentId, UUID correlationId,
                         Instant timestamp, String reason) { }
}
