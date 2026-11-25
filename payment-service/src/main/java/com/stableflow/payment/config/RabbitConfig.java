package com.stableflow.payment.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stableflow.payment.events.RabbitPaymentEventPublisher;

@Configuration
public class RabbitConfig {
    public static final String CONFIRMED_QUEUE = "payment.blockchain.confirmed";
    public static final String FAILED_QUEUE = "payment.blockchain.failed";

    @Bean DirectExchange stableflowExchange() { return new DirectExchange(RabbitPaymentEventPublisher.EXCHANGE, true, false); }
    @Bean DirectExchange deadLetterExchange() { return new DirectExchange("stableflow.events.dlx", true, false); }

    @Bean
        Queue confirmedQueue() { return new Queue(CONFIRMED_QUEUE, true, false, false,
            java.util.Map.of("x-dead-letter-exchange", "stableflow.events.dlx", "x-dead-letter-routing-key", "payment.confirmed.dlq")); }

    @Bean
        Queue failedQueue() { return new Queue(FAILED_QUEUE, true, false, false,
            java.util.Map.of("x-dead-letter-exchange", "stableflow.events.dlx", "x-dead-letter-routing-key", "payment.failed.dlq")); }

        @Bean Queue confirmedDlq() { return new Queue("payment.blockchain.confirmed.dlq", true); }
        @Bean Queue failedDlq() { return new Queue("payment.blockchain.failed.dlq", true); }

    @Bean
    Binding confirmedBinding(Queue confirmedQueue, @Qualifier("stableflowExchange") DirectExchange exchange) {
        return BindingBuilder.bind(confirmedQueue).to(exchange).with("blockchain.transaction.confirmed.v1");
    }

    @Bean
    Binding failedBinding(Queue failedQueue, @Qualifier("stableflowExchange") DirectExchange exchange) {
        return BindingBuilder.bind(failedQueue).to(exchange).with("blockchain.transaction.failed.v1");
    }

    @Bean Binding confirmedDlqBinding(Queue confirmedDlq, @Qualifier("deadLetterExchange") DirectExchange exchange) {
        return BindingBuilder.bind(confirmedDlq).to(exchange).with("payment.confirmed.dlq");
    }

    @Bean Binding failedDlqBinding(Queue failedDlq, @Qualifier("deadLetterExchange") DirectExchange exchange) {
        return BindingBuilder.bind(failedDlq).to(exchange).with("payment.failed.dlq");
    }

    @Bean
    Jackson2JsonMessageConverter messageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory, Jackson2JsonMessageConverter converter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(converter);
        factory.setDefaultRequeueRejected(false);
        ExponentialBackOffPolicy backOff = new ExponentialBackOffPolicy();
        backOff.setInitialInterval(250); backOff.setMultiplier(2); backOff.setMaxInterval(2000);
        org.aopalliance.aop.Advice retry = RetryInterceptorBuilder.stateless()
            .retryPolicy(new SimpleRetryPolicy(3)).backOffPolicy(backOff)
                .recoverer(new RejectAndDontRequeueRecoverer()).build();
        factory.setAdviceChain(retry);
        return factory;
    }
}
