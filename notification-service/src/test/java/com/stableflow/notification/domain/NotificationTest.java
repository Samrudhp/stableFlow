package com.stableflow.notification.domain;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class NotificationTest {
    @Test
    void storesPaymentStatus() {
        Notification notification = new Notification(UUID.randomUUID(), "SETTLED", "complete");
        assertThat(notification.getStatus()).isEqualTo("SETTLED");
    }
}
