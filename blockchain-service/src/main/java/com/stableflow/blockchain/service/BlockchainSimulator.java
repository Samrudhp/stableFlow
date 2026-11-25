package com.stableflow.blockchain.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import com.stableflow.blockchain.domain.BlockchainStatus;
import com.stableflow.blockchain.domain.BlockchainTransaction;
import com.stableflow.blockchain.events.Events;
import com.stableflow.blockchain.repository.BlockchainTransactionRepository;

import jakarta.transaction.Transactional;

@Component
public class BlockchainSimulator {
    private static final String EXCHANGE = "stableflow.events";
    private final BlockchainTransactionRepository repository;
    private final RabbitTemplate rabbitTemplate;
    private final TaskScheduler scheduler;
    private final String mode;
    private final long delayMs;

    public BlockchainSimulator(BlockchainTransactionRepository repository, RabbitTemplate rabbitTemplate,
                                TaskScheduler scheduler, @Value("${simulation.mode:success}") String mode,
                                @Value("${simulation.delay-ms:250}") long delayMs) {
        this.repository = repository; this.rabbitTemplate = rabbitTemplate; this.scheduler = scheduler;
        this.mode = mode; this.delayMs = delayMs;
    }

    @RabbitListener(queues = "blockchain.transaction.requested")
    @Transactional
    public void submit(Events.Requested event) {
        if (repository.findByPaymentId(event.paymentId()).isPresent()) return;
        BlockchainTransaction transaction = repository.save(new BlockchainTransaction(
                event.paymentId(), event.receiverWalletId(), event.amount(), event.currency()));
        scheduler.schedule(() -> finish(transaction.getPaymentId(), event.correlationId()),
                Instant.now().plusMillis(delayMs));
    }

    @Transactional
    public void finish(UUID paymentId, UUID correlationId) {
        BlockchainTransaction transaction = repository.findByPaymentId(paymentId).orElse(null);
        if (transaction == null || transaction.getStatus() != BlockchainStatus.PENDING) return;
        if ("failure".equalsIgnoreCase(mode)) {
            transaction.fail();
            rabbitTemplate.convertAndSend(EXCHANGE, "blockchain.transaction.failed.v1",
                    new Events.Failed(UUID.randomUUID(), "BlockchainTransactionFailed", 1, paymentId,
                            correlationId, Instant.now(), "SIMULATED_FAILURE"));
            return;
        }
        transaction.confirm();
        rabbitTemplate.convertAndSend(EXCHANGE, "blockchain.transaction.confirmed.v1",
                new Events.Confirmed(UUID.randomUUID(), "BlockchainTransactionConfirmed", 1, paymentId,
                        correlationId, Instant.now(), transaction.getTransactionHash()));
    }
}
