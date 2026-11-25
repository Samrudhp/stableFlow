package com.stableflow.blockchain.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "blockchain_transactions")
public class BlockchainTransaction {
    @Id private UUID id;
    @Column(nullable = false, unique = true) private UUID paymentId;
    @Column(nullable = false) private UUID receiverWalletId;
    @Column(nullable = false, precision = 24, scale = 6) private BigDecimal amount;
    @Column(nullable = false, length = 10) private String currency;
    @Column(nullable = false, length = 80) private String transactionHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private BlockchainStatus status;
    @Column(nullable = false) private Instant createdAt;

    protected BlockchainTransaction() { }
    public BlockchainTransaction(UUID paymentId, UUID receiverWalletId, BigDecimal amount, String currency) {
        this.id = UUID.randomUUID(); this.paymentId = paymentId; this.receiverWalletId = receiverWalletId;
        this.amount = amount; this.currency = currency; this.transactionHash = "0x" + UUID.randomUUID().toString().replace("-", "");
        this.status = BlockchainStatus.PENDING; this.createdAt = Instant.now();
    }
    public UUID getPaymentId() { return paymentId; }
    public String getTransactionHash() { return transactionHash; }
    public BlockchainStatus getStatus() { return status; }
    public void confirm() { status = BlockchainStatus.CONFIRMED; }
    public void fail() { status = BlockchainStatus.FAILED; }
}
