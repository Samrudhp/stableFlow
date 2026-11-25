package com.stableflow.blockchain.domain;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class BlockchainTransactionTest {
    @Test
    void startsPendingAndCanBeConfirmed() {
        BlockchainTransaction transaction = new BlockchainTransaction(UUID.randomUUID(), UUID.randomUUID(),
                new BigDecimal("10"), "USDC");
        assertThat(transaction.getStatus()).isEqualTo(BlockchainStatus.PENDING);
        transaction.confirm();
        assertThat(transaction.getStatus()).isEqualTo(BlockchainStatus.CONFIRMED);
    }
}
