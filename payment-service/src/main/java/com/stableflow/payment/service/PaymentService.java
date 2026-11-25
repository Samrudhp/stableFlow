package com.stableflow.payment.service;

import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import com.stableflow.payment.api.PaymentDtos;
import com.stableflow.payment.client.WalletClient;
import com.stableflow.payment.domain.Payment;
import com.stableflow.payment.events.PaymentEventPublisher;
import com.stableflow.payment.repository.PaymentRepository;

import jakarta.transaction.Transactional;

@Service
public class PaymentService {
    private static final String USDC = "USDC";
    private final PaymentRepository paymentRepository;
    private final WalletClient walletClient;
    private final PaymentEventPublisher eventPublisher;

    public PaymentService(PaymentRepository paymentRepository, WalletClient walletClient,
                          PaymentEventPublisher eventPublisher) {
        this.paymentRepository = paymentRepository;
        this.walletClient = walletClient;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public PaymentDtos.PaymentResponse create(PaymentDtos.CreatePaymentRequest request, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key header is required");
        }
        if (!USDC.equals(request.currency())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only USDC payments are supported");
        }
        if (request.senderWalletId().equals(request.receiverWalletId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sender and receiver must differ");
        }
        Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }

        Payment payment = paymentRepository.save(new Payment(request.senderWalletId(), request.receiverWalletId(),
                request.amount(), request.currency(), idempotencyKey));
        try {
                walletClient.reserve(payment.getSenderWalletId(), payment.getId(), payment.getReceiverWalletId(),
                    payment.getAmount(), payment.getCurrency());
            payment.markFundsReserved();
                payment.markProcessing();
                eventPublisher.publishBlockchainRequest(payment);
            return toResponse(payment);
        } catch (RestClientException exception) {
            payment.markFailed();
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Funds could not be reserved", exception);
        } catch (DataIntegrityViolationException exception) {
            Payment concurrent = paymentRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> exception);
            return toResponse(concurrent);
        }
    }

    @Transactional
    public PaymentDtos.PaymentResponse get(UUID paymentId) {
        return paymentRepository.findById(paymentId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private PaymentDtos.PaymentResponse toResponse(Payment payment) {
        return new PaymentDtos.PaymentResponse(payment.getId(), payment.getSenderWalletId(),
                payment.getReceiverWalletId(), payment.getAmount(), payment.getCurrency(), payment.getStatus());
    }
}
