package com.stableflow.payment.events;

import java.time.Instant;
import java.util.UUID;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stableflow.payment.domain.OutboxEvent;
import com.stableflow.payment.domain.Payment;
import com.stableflow.payment.repository.OutboxEventRepository;

@Component
public class RabbitPaymentEventPublisher implements PaymentEventPublisher {
    public static final String EXCHANGE = "stableflow.events";
    public static final String BLOCKCHAIN_REQUEST = "blockchain.transaction.requested.v1";
    public static final String PAYMENT_STATUS = "payment.status.changed.v1";
    private final RabbitTemplate rabbitTemplate;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public RabbitPaymentEventPublisher(RabbitTemplate rabbitTemplate, OutboxEventRepository outboxRepository,
                                       ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publishBlockchainRequest(Payment payment) {
        BlockchainTransactionRequested event = new BlockchainTransactionRequested(
                UUID.randomUUID(), "BlockchainTransactionRequested", 1, payment.getId(), payment.getId(),
                Instant.now(), payment.getSenderWalletId(), payment.getReceiverWalletId(),
                payment.getAmount(), payment.getCurrency());
        save(BLOCKCHAIN_REQUEST, event);
    }

    @Override
    public void publishStatus(Payment payment, String transactionHash) {
        PaymentStatusChanged event = new PaymentStatusChanged(
                UUID.randomUUID(), "PaymentStatusChanged", 1, payment.getId(), payment.getId(),
                Instant.now(), payment.getStatus(), transactionHash);
        save(PAYMENT_STATUS, event);
    }

    private void save(String routingKey, Object event) {
        try {
            outboxRepository.save(new OutboxEvent(routingKey, objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize payment event", exception);
        }
    }

    @Scheduled(fixedDelayString = "${outbox.poll-ms:1000}")
    @Transactional
    public void publishPending() {
        for (OutboxEvent event : outboxRepository.findTop100ByPublishedFalseOrderByCreatedAt()) {
            Message message = MessageBuilder.withBody(event.getPayload().getBytes(java.nio.charset.StandardCharsets.UTF_8))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON).build();
            rabbitTemplate.send(EXCHANGE, event.getRoutingKey(), message);
            event.markPublished();
        }
    }
}
