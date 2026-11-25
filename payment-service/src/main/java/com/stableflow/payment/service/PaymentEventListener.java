package com.stableflow.payment.service;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.stableflow.payment.client.WalletClient;
import com.stableflow.payment.domain.Payment;
import com.stableflow.payment.domain.PaymentStatus;
import com.stableflow.payment.domain.ProcessedEvent;
import com.stableflow.payment.events.BlockchainTransactionConfirmed;
import com.stableflow.payment.events.BlockchainTransactionFailed;
import com.stableflow.payment.events.PaymentEventPublisher;
import com.stableflow.payment.repository.PaymentRepository;
import com.stableflow.payment.repository.ProcessedEventRepository;

import jakarta.transaction.Transactional;

@Component
public class PaymentEventListener {
    private final PaymentRepository paymentRepository;
    private final WalletClient walletClient;
    private final PaymentEventPublisher eventPublisher;
    private final ProcessedEventRepository processedEventRepository;

    public PaymentEventListener(PaymentRepository paymentRepository, WalletClient walletClient,
                                PaymentEventPublisher eventPublisher, ProcessedEventRepository processedEventRepository) {
        this.paymentRepository = paymentRepository;
        this.walletClient = walletClient;
        this.eventPublisher = eventPublisher;
        this.processedEventRepository = processedEventRepository;
    }

    @Transactional
    @RabbitListener(queues = "payment.blockchain.confirmed")
    public void onConfirmed(BlockchainTransactionConfirmed event) {
        if (processedEventRepository.existsById(event.eventId())) return;
        Payment payment = paymentRepository.findById(event.paymentId()).orElse(null);
        if (payment == null || payment.getStatus() == PaymentStatus.SETTLED) return;
        if (payment.getStatus() != PaymentStatus.PROCESSING) return;
        walletClient.settle(payment.getId());
        payment.markSettled();
        processedEventRepository.save(new ProcessedEvent(event.eventId()));
        eventPublisher.publishStatus(payment, event.transactionHash());
    }

    @Transactional
    @RabbitListener(queues = "payment.blockchain.failed")
    public void onFailed(BlockchainTransactionFailed event) {
        if (processedEventRepository.existsById(event.eventId())) return;
        Payment payment = paymentRepository.findById(event.paymentId()).orElse(null);
        if (payment == null || payment.getStatus() == PaymentStatus.FAILED) return;
        if (payment.getStatus() != PaymentStatus.PROCESSING) return;
        walletClient.release(payment.getId());
        payment.markFailed();
        processedEventRepository.save(new ProcessedEvent(event.eventId()));
        eventPublisher.publishStatus(payment, null);
    }
}
