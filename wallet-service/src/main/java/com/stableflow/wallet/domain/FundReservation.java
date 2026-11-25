package com.stableflow.wallet.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "fund_reservations")
public class FundReservation {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID paymentId;

    @Column(nullable = false)
    private UUID senderWalletId;

    @Column(nullable = false)
    private UUID receiverWalletId;

    @Column(nullable = false, precision = 24, scale = 6)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected FundReservation() {
    }

    public FundReservation(UUID paymentId, UUID senderWalletId, UUID receiverWalletId, BigDecimal amount) {
        this.id = UUID.randomUUID();
        this.paymentId = paymentId;
        this.senderWalletId = senderWalletId;
        this.receiverWalletId = receiverWalletId;
        this.amount = amount.setScale(6);
        this.status = ReservationStatus.RESERVED;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public UUID getPaymentId() { return paymentId; }
    public UUID getSenderWalletId() { return senderWalletId; }
    public UUID getReceiverWalletId() { return receiverWalletId; }
    public BigDecimal getAmount() { return amount; }
    public ReservationStatus getStatus() { return status; }
    public void settle() { status = ReservationStatus.SETTLED; }
    public void release() { status = ReservationStatus.RELEASED; }
}
