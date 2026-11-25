package com.stableflow.notification.service;

import com.stableflow.notification.domain.Notification;
import com.stableflow.notification.events.PaymentStatusChanged;
import com.stableflow.notification.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationListener {
    private final NotificationRepository repository;
    public NotificationListener(NotificationRepository repository) { this.repository = repository; }

    @Transactional
    @RabbitListener(queues = "notification.payment.status")
    public void onStatusChanged(PaymentStatusChanged event) {
        if (repository.existsByPaymentIdAndStatus(event.paymentId(), event.status())) return;
        repository.save(new Notification(event.paymentId(), event.status(),
                "Payment " + event.paymentId() + " is " + event.status()));
    }
}
