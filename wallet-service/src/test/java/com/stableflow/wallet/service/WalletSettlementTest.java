package com.stableflow.wallet.service;

import com.stableflow.wallet.api.InternalWalletDtos;
import com.stableflow.wallet.domain.FundReservation;
import com.stableflow.wallet.domain.Wallet;
import com.stableflow.wallet.repository.FundReservationRepository;
import com.stableflow.wallet.repository.WalletRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WalletSettlementTest {
    private final WalletRepository walletRepository = mock(WalletRepository.class);
    private final FundReservationRepository reservationRepository = mock(FundReservationRepository.class);
    private final WalletService service = new WalletService(walletRepository, reservationRepository);

    @Test
    void settlementConsumesReservedFundsAndCreditsReceiver() {
        UUID paymentId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();
        Wallet sender = new Wallet("Alice", "USDC", new BigDecimal("20"));
        Wallet receiver = new Wallet("Bob", "USDC", new BigDecimal("10"));
        sender.reserve(new BigDecimal("10"));
        FundReservation reservation = new FundReservation(paymentId, sender.getId(), receiverId,
                new BigDecimal("10"));
        when(reservationRepository.findByPaymentIdForUpdate(paymentId)).thenReturn(Optional.of(reservation));
        when(walletRepository.findByIdForUpdate(sender.getId())).thenReturn(Optional.of(sender));
        when(walletRepository.findByIdForUpdate(receiverId)).thenReturn(Optional.of(receiver));

        service.settle(new InternalWalletDtos.SettleRequest(paymentId));

        assertThat(sender.getAvailableBalance()).isEqualByComparingTo("10");
        assertThat(sender.getReservedBalance()).isEqualByComparingTo("0");
        assertThat(receiver.getAvailableBalance()).isEqualByComparingTo("20");
    }
}
