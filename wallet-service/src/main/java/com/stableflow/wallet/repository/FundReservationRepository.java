package com.stableflow.wallet.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.stableflow.wallet.domain.FundReservation;

import jakarta.persistence.LockModeType;

public interface FundReservationRepository extends JpaRepository<FundReservation, UUID> {
    Optional<FundReservation> findByPaymentId(UUID paymentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select reservation from FundReservation reservation where reservation.paymentId = :paymentId")
    Optional<FundReservation> findByPaymentIdForUpdate(@Param("paymentId") UUID paymentId);
}
