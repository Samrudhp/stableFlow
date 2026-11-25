package com.stableflow.payment.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.stableflow.payment.client.WalletClient;
import com.stableflow.payment.domain.Payment;
import com.stableflow.payment.domain.PaymentStatus;
import com.stableflow.payment.domain.ProcessedEvent;
import com.stableflow.payment.events.BlockchainTransactionConfirmed;
import com.stableflow.payment.events.PaymentEventPublisher;
import com.stableflow.payment.repository.PaymentRepository;
import com.stableflow.payment.repository.ProcessedEventRepository;

class PaymentEventListenerTest {
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final WalletClient walletClient = mock(WalletClient.class);
    private final PaymentEventPublisher eventPublisher = mock(PaymentEventPublisher.class);
    private final ProcessedEventRepository processedEvents = mock(ProcessedEventRepository.class);
    private final PaymentEventListener listener = new PaymentEventListener(
            paymentRepository, walletClient, eventPublisher, processedEvents);

    @Test
    void settlesOnlyOnceWhenConfirmationIsRedelivered() {
        UUID sender = UUID.randomUUID();
        UUID receiver = UUID.randomUUID();
        Payment payment = new Payment(sender, receiver, new BigDecimal("100"), "USDC", "key");
        payment.markProcessing();
        UUID eventId = UUID.randomUUID();
        BlockchainTransactionConfirmed event = new BlockchainTransactionConfirmed(
                eventId, "BlockchainTransactionConfirmed", 1, payment.getId(), payment.getId(),
                Instant.now(), "0xabc");
        when(processedEvents.existsById(eventId)).thenReturn(false, true);
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));

        listener.onConfirmed(event);
        listener.onConfirmed(event);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SETTLED);
        verify(walletClient, times(1)).settle(payment.getId());
        verify(processedEvents, times(1)).save(any(ProcessedEvent.class));
        verify(eventPublisher, times(1)).publishStatus(payment, "0xabc");
    }
}
