package com.stableflow.blockchain.repository;

import com.stableflow.blockchain.domain.BlockchainTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BlockchainTransactionRepository extends JpaRepository<BlockchainTransaction, UUID> {
    Optional<BlockchainTransaction> findByPaymentId(UUID paymentId);
}
