package com.stableflow.blockchain.config;

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

@Configuration
public class RabbitConfig {
    static final String EXCHANGE = "stableflow.events";
    @Bean DirectExchange exchange() { return new DirectExchange(EXCHANGE, true, false); }
        @Bean DirectExchange deadLetterExchange() { return new DirectExchange("stableflow.events.dlx", true, false); }
        @Bean Queue requestedQueue() { return new Queue("blockchain.transaction.requested", true, false, false,
            java.util.Map.of("x-dead-letter-exchange", "stableflow.events.dlx", "x-dead-letter-routing-key", "blockchain.requested.dlq")); }
        @Bean Queue requestedDlq() { return new Queue("blockchain.transaction.requested.dlq", true); }
    @Bean Binding requestedBinding(Queue requestedQueue, @Qualifier("exchange") DirectExchange exchange) {
        return BindingBuilder.bind(requestedQueue).to(exchange).with("blockchain.transaction.requested.v1");
    }
    @Bean Binding requestedDlqBinding(Queue requestedDlq, @Qualifier("deadLetterExchange") DirectExchange exchange) {
        return BindingBuilder.bind(requestedDlq).to(exchange).with("blockchain.requested.dlq");
    }
    @Bean Jackson2JsonMessageConverter messageConverter(ObjectMapper mapper) { return new Jackson2JsonMessageConverter(mapper); }
    @Bean SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory, Jackson2JsonMessageConverter converter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory); factory.setMessageConverter(converter);
        factory.setDefaultRequeueRejected(false);
        ExponentialBackOffPolicy backOff = new ExponentialBackOffPolicy();
        backOff.setInitialInterval(250); backOff.setMultiplier(2); backOff.setMaxInterval(2000);
        org.aopalliance.aop.Advice retry = RetryInterceptorBuilder.stateless().retryPolicy(new SimpleRetryPolicy(3))
                .backOffPolicy(backOff).recoverer(new RejectAndDontRequeueRecoverer()).build();
        factory.setAdviceChain(retry); return factory;
    }
}
