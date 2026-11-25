package com.stableflow.payment.domain;

public enum PaymentStatus {
    CREATED,
    FUNDS_RESERVED,
    PROCESSING,
    SETTLED,
    FAILED
}
