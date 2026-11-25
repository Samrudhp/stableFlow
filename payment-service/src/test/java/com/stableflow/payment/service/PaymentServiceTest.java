package com.stableflow.payment.service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.stableflow.payment.api.PaymentDtos;
import com.stableflow.payment.client.WalletClient;
import com.stableflow.payment.domain.PaymentStatus;
import com.stableflow.payment.events.PaymentEventPublisher;
import com.stableflow.payment.repository.PaymentRepository;

class PaymentServiceTest {
    private final PaymentRepository repository = mock(PaymentRepository.class);
    private final WalletClient walletClient = mock(WalletClient.class);
    private final PaymentEventPublisher eventPublisher = mock(PaymentEventPublisher.class);
    private final PaymentService service = new PaymentService(repository, walletClient, eventPublisher);

    @Test
    void createsPaymentAndReservesSenderFunds() {
        UUID sender = UUID.randomUUID();
        UUID receiver = UUID.randomUUID();
        PaymentDtos.CreatePaymentRequest request = new PaymentDtos.CreatePaymentRequest(
                sender, receiver, new BigDecimal("100"), "USDC");
        when(repository.findByIdempotencyKey("request-1")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentDtos.PaymentResponse response = service.create(request, "request-1");

        assertThat(response.status()).isEqualTo(PaymentStatus.PROCESSING);
        verify(walletClient).reserve(eq(sender), eq(response.paymentId()), eq(receiver),
            eq(new BigDecimal("100.000000")), eq("USDC"));
        verify(eventPublisher).publishBlockchainRequest(any());
    }

    @Test
    void returnsExistingPaymentForRepeatedIdempotencyKey() {
        UUID sender = UUID.randomUUID();
        UUID receiver = UUID.randomUUID();
        PaymentDtos.CreatePaymentRequest request = new PaymentDtos.CreatePaymentRequest(
                sender, receiver, new BigDecimal("100"), "USDC");
        when(repository.findByIdempotencyKey("request-1")).thenReturn(Optional.of(
                new com.stableflow.payment.domain.Payment(sender, receiver, new BigDecimal("100"), "USDC", "request-1")));

        service.create(request, "request-1");

        verifyNoInteractions(walletClient);
        verify(repository, never()).save(any());
    }
}
