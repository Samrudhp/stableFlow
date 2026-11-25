package com.stableflow.wallet.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "wallets")
public class Wallet {
    @Id
    private UUID id;

    @Column(nullable = false)
    private String ownerName;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(nullable = false, precision = 24, scale = 6)
    private BigDecimal availableBalance;

    @Column(nullable = false, precision = 24, scale = 6)
    private BigDecimal reservedBalance;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Wallet() {
    }

    public Wallet(String ownerName, String currency, BigDecimal initialBalance) {
        this.id = UUID.randomUUID();
        this.ownerName = ownerName;
        this.currency = currency;
        this.availableBalance = initialBalance;
        this.reservedBalance = BigDecimal.ZERO;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getOwnerName() { return ownerName; }
    public String getCurrency() { return currency; }
    public BigDecimal getAvailableBalance() { return availableBalance; }
    public BigDecimal getReservedBalance() { return reservedBalance; }

    public void reserve(BigDecimal amount) {
        availableBalance = availableBalance.subtract(amount);
        reservedBalance = reservedBalance.add(amount);
    }

    public void release(BigDecimal amount) {
        reservedBalance = reservedBalance.subtract(amount);
        availableBalance = availableBalance.add(amount);
    }

    public void settleDebit(BigDecimal amount) {
        reservedBalance = reservedBalance.subtract(amount);
    }

    public void credit(BigDecimal amount) {
        availableBalance = availableBalance.add(amount);
    }
}
