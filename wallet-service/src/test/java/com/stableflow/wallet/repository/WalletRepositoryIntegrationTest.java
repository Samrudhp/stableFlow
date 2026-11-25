package com.stableflow.wallet.repository;

import com.stableflow.wallet.domain.Wallet;
import com.stableflow.wallet.api.WalletDtos;
import com.stableflow.wallet.service.WalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ExecutionException;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class WalletRepositoryIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private WalletService walletService;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test
    void persistsWalletThroughFlywaySchema() {
        Wallet saved = walletRepository.save(new Wallet("Integration Alice", "USDC", new BigDecimal("25")));

        assertThat(walletRepository.findById(saved.getId())).isPresent()
                .get().extracting(Wallet::getAvailableBalance)
                .isEqualTo(new BigDecimal("25.000000"));
    }

    @Test
    void allowsAtMostOneConcurrentReservationWhenFundsAreInsufficientForBoth() throws Exception {
        Wallet wallet = walletRepository.save(new Wallet("Concurrent Alice", "USDC", new BigDecimal("100")));
        UUID receiver = UUID.randomUUID();
        Callable<WalletDtos.WalletResponse> reservation = () -> walletService.reserve(wallet.getId(),
                new WalletDtos.ReserveFundsRequest(UUID.randomUUID(), receiver, new BigDecimal("80"), "USDC"));
        ExecutorService executor = Executors.newFixedThreadPool(2);
        List<Future<WalletDtos.WalletResponse>> results = executor.invokeAll(List.of(reservation, reservation));
        executor.shutdown();

        long successes = results.stream().filter(result -> {
            try { result.get(); return true; }
            catch (InterruptedException exception) { Thread.currentThread().interrupt(); return false; }
            catch (ExecutionException exception) { return false; }
        }).count();

        org.assertj.core.api.Assertions.assertThat(successes).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(walletRepository.findById(wallet.getId()).orElseThrow()
                .getAvailableBalance()).isEqualByComparingTo("20");
    }
}