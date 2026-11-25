package com.stableflow.wallet.api;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public final class InternalWalletDtos {
    private InternalWalletDtos() { }

    public record SettleRequest(@NotNull UUID paymentId) { }
    public record ReleaseRequest(@NotNull UUID paymentId) { }
}
