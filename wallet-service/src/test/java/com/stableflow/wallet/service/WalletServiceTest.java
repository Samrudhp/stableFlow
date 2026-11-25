package com.stableflow.wallet.service;

import com.stableflow.wallet.api.WalletDtos;
import com.stableflow.wallet.domain.Wallet;
import com.stableflow.wallet.repository.FundReservationRepository;
import com.stableflow.wallet.repository.WalletRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WalletServiceTest {
    private final WalletRepository repository = org.mockito.Mockito.mock(WalletRepository.class);
    private final FundReservationRepository reservationRepository = org.mockito.Mockito.mock(FundReservationRepository.class);
    private final WalletService service = new WalletService(repository, reservationRepository);

    @Test
    void reservesFundsWithoutAllowingAvailableBalanceToGoNegative() {
        Wallet wallet = new Wallet("Alice", "USDC", new BigDecimal("100.000000"));
        UUID walletId = wallet.getId();
        when(repository.findByIdForUpdate(walletId)).thenReturn(java.util.Optional.of(wallet));
        WalletDtos.ReserveFundsRequest request = new WalletDtos.ReserveFundsRequest(
            UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("80"), "USDC");

        WalletDtos.WalletResponse result = service.reserve(walletId, request);

        assertThat(result.availableBalance()).isEqualByComparingTo("20.000000");
        assertThat(result.reservedBalance()).isEqualByComparingTo("80.000000");
        verify(repository).findByIdForUpdate(walletId);
    }
}
