package com.stableflow.payment.events;

import com.stableflow.payment.domain.Payment;

public interface PaymentEventPublisher {
    void publishBlockchainRequest(Payment payment);
    void publishStatus(Payment payment, String transactionHash);
}
