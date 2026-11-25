package com.stableflow.wallet.api;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class WalletDtos {
    private WalletDtos() { }

    public record CreateWalletRequest(
            @NotBlank String ownerName,
            @Pattern(regexp = "USDC", message = "currency must be USDC") String currency,
            @NotNull @DecimalMin(value = "0.000001") BigDecimal initialBalance) { }

    public record ReserveFundsRequest(
            @NotNull UUID paymentId,
            @NotNull UUID receiverWalletId,
            @NotNull @DecimalMin(value = "0.000001") BigDecimal amount,
            @Pattern(regexp = "USDC", message = "currency must be USDC") String currency) { }

    public record WalletResponse(UUID walletId, String ownerName, String currency,
                                 BigDecimal availableBalance, BigDecimal reservedBalance) { }

    public record BalanceResponse(UUID walletId, String currency,
                                  BigDecimal availableBalance, BigDecimal reservedBalance) { }
}
