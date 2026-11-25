package com.stableflow.wallet.api;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.stableflow.wallet.service.WalletService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {
    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WalletDtos.WalletResponse create(@Valid @RequestBody WalletDtos.CreateWalletRequest request) {
        return walletService.create(request);
    }

    @GetMapping("/{walletId}")
    public WalletDtos.WalletResponse get(@PathVariable UUID walletId) {
        return walletService.get(walletId);
    }

    @GetMapping("/{walletId}/balance")
    public WalletDtos.BalanceResponse balance(@PathVariable UUID walletId) {
        return walletService.balance(walletId);
    }

    @PostMapping("/{walletId}/reserve")
    public WalletDtos.WalletResponse reserve(@PathVariable UUID walletId,
                                             @Valid @RequestBody WalletDtos.ReserveFundsRequest request) {
        return walletService.reserve(walletId, request);
    }

    @PostMapping("/internal/settle")
    public WalletDtos.WalletResponse settle(@Valid @RequestBody InternalWalletDtos.SettleRequest request) {
        return walletService.settle(request);
    }

    @PostMapping("/internal/release")
    public WalletDtos.WalletResponse release(@Valid @RequestBody InternalWalletDtos.ReleaseRequest request) {
        return walletService.release(request);
    }
}
