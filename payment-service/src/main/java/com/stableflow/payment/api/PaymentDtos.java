package com.stableflow.payment.api;

import java.math.BigDecimal;
import java.util.UUID;

import com.stableflow.payment.domain.PaymentStatus;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class PaymentDtos {
    private PaymentDtos() { }

    public record CreatePaymentRequest(
            @NotNull UUID senderWalletId,
            @NotNull UUID receiverWalletId,
            @NotNull @DecimalMin(value = "0.000001") BigDecimal amount,
            @Pattern(regexp = "USDC", message = "currency must be USDC") String currency) { }

    public record PaymentResponse(UUID paymentId, UUID senderWalletId, UUID receiverWalletId,
                                  BigDecimal amount, String currency, PaymentStatus status) { }
}
