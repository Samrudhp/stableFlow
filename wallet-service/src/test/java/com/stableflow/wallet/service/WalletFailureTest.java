package com.stableflow.wallet.service;

import com.stableflow.wallet.api.WalletDtos;
import com.stableflow.wallet.domain.Wallet;
import com.stableflow.wallet.repository.FundReservationRepository;
import com.stableflow.wallet.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class WalletFailureTest {
    private final WalletRepository walletRepository = mock(WalletRepository.class);
    private final FundReservationRepository reservationRepository = mock(FundReservationRepository.class);
    private final WalletService service = new WalletService(walletRepository, reservationRepository);

    @Test
    void rejectsReservationWhenAvailableFundsAreInsufficient() {
        Wallet wallet = new Wallet("Alice", "USDC", new BigDecimal("50"));
        UUID paymentId = UUID.randomUUID();
        when(reservationRepository.findByPaymentId(paymentId)).thenReturn(Optional.empty());
        when(walletRepository.findByIdForUpdate(wallet.getId())).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> service.reserve(wallet.getId(), new WalletDtos.ReserveFundsRequest(
                paymentId, UUID.randomUUID(), new BigDecimal("100"), "USDC")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Insufficient available funds");
        verify(reservationRepository, never()).save(any());
    }
}
