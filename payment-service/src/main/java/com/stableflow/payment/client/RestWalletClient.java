package com.stableflow.payment.client;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RestWalletClient implements WalletClient {
    private final RestClient restClient;

    public RestWalletClient(RestClient.Builder builder,
                            @Value("${services.wallet.url:http://localhost:8082}") String walletUrl) {
        this.restClient = builder.baseUrl(walletUrl).build();
    }

    @Override
    public void reserve(UUID walletId, UUID paymentId, UUID receiverWalletId, BigDecimal amount, String currency) {
        restClient.post()
                .uri("/api/wallets/{walletId}/reserve", walletId)
                .body(Map.of("paymentId", paymentId, "receiverWalletId", receiverWalletId,
                        "amount", amount, "currency", currency))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void settle(UUID paymentId) {
        restClient.post().uri("/api/wallets/internal/settle")
                .body(Map.of("paymentId", paymentId)).retrieve().toBodilessEntity();
    }

    @Override
    public void release(UUID paymentId) {
        restClient.post().uri("/api/wallets/internal/release")
                .body(Map.of("paymentId", paymentId)).retrieve().toBodilessEntity();
    }
}
