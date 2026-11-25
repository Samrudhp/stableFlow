package com.stableflow.payment.client;

import java.math.BigDecimal;
import java.util.UUID;

public interface WalletClient {
    void reserve(UUID walletId, UUID paymentId, UUID receiverWalletId, BigDecimal amount, String currency);
    void settle(UUID paymentId);
    void release(UUID paymentId);
}
