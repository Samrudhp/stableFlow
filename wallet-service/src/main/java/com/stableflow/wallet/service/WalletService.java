package com.stableflow.wallet.service;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.stableflow.wallet.api.InternalWalletDtos;
import com.stableflow.wallet.api.WalletDtos;
import com.stableflow.wallet.domain.FundReservation;
import com.stableflow.wallet.domain.ReservationStatus;
import com.stableflow.wallet.domain.Wallet;
import com.stableflow.wallet.repository.FundReservationRepository;
import com.stableflow.wallet.repository.WalletRepository;

import jakarta.transaction.Transactional;

@Service
public class WalletService {
    private static final String USDC = "USDC";
    private final WalletRepository walletRepository;
    private final FundReservationRepository reservationRepository;

    public WalletService(WalletRepository walletRepository, FundReservationRepository reservationRepository) {
        this.walletRepository = walletRepository;
        this.reservationRepository = reservationRepository;
    }

    @Transactional
    public WalletDtos.WalletResponse create(WalletDtos.CreateWalletRequest request) {
        String currency = request.currency() == null ? USDC : request.currency();
        if (!USDC.equals(currency)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only USDC wallets are supported");
        }
        if (request.initialBalance().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Initial balance cannot be negative");
        }
        return toResponse(walletRepository.save(new Wallet(request.ownerName(), currency,
                request.initialBalance().setScale(6))));
    }

    @Transactional
    public WalletDtos.WalletResponse reserve(UUID walletId, WalletDtos.ReserveFundsRequest request) {
        if (!USDC.equals(request.currency())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only USDC reservations are supported");
        }
        FundReservation existing = reservationRepository.findByPaymentId(request.paymentId()).orElse(null);
        if (existing != null) {
            return get(walletId);
        }
        Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        BigDecimal amount = request.amount().setScale(6);
        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient available funds");
        }
        wallet.reserve(amount);
        reservationRepository.save(new FundReservation(request.paymentId(), walletId,
                request.receiverWalletId(), amount));
        return toResponse(wallet);
    }

    @Transactional
    public WalletDtos.WalletResponse settle(InternalWalletDtos.SettleRequest request) {
        FundReservation reservation = reservationRepository.findByPaymentIdForUpdate(request.paymentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (reservation.getStatus() == ReservationStatus.SETTLED) {
            return get(reservation.getSenderWalletId());
        }
        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation was released");
        }
        Wallet sender = walletRepository.findByIdForUpdate(reservation.getSenderWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender wallet not found"));
        Wallet receiver = walletRepository.findByIdForUpdate(reservation.getReceiverWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receiver wallet not found"));
        sender.settleDebit(reservation.getAmount());
        receiver.credit(reservation.getAmount());
        reservation.settle();
        return toResponse(sender);
    }

    @Transactional
    public WalletDtos.WalletResponse release(InternalWalletDtos.ReleaseRequest request) {
        FundReservation reservation = reservationRepository.findByPaymentIdForUpdate(request.paymentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (reservation.getStatus() == ReservationStatus.RELEASED) {
            return get(reservation.getSenderWalletId());
        }
        if (reservation.getStatus() == ReservationStatus.SETTLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Settlement already completed");
        }
        Wallet sender = walletRepository.findByIdForUpdate(reservation.getSenderWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender wallet not found"));
        sender.release(reservation.getAmount());
        reservation.release();
        return toResponse(sender);
    }

    @Transactional
    public WalletDtos.BalanceResponse balance(UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        return new WalletDtos.BalanceResponse(wallet.getId(), wallet.getCurrency(),
                wallet.getAvailableBalance(), wallet.getReservedBalance());
    }

    public WalletDtos.WalletResponse get(UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        return toResponse(wallet);
    }

    private WalletDtos.WalletResponse toResponse(Wallet wallet) {
        return new WalletDtos.WalletResponse(wallet.getId(), wallet.getOwnerName(), wallet.getCurrency(),
                wallet.getAvailableBalance(), wallet.getReservedBalance());
    }
}
