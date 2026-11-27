package com.stableflow.gateway.security;

import java.util.List;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Mono;

/**
 * Global gateway filter that enforces API key authentication on every route.
 * Requests to /actuator/** are excluded so health checks work without a key.
 * Any other request missing a valid X-API-Key header receives 401 Unauthorized.
 */
@Component
public class ApiKeyAuthFilter implements GlobalFilter, Ordered {

    static final String API_KEY_HEADER = "X-API-Key";

    private final List<String> validKeys;

    public ApiKeyAuthFilter(ApiKeyProperties properties) {
        this.validKeys = properties.getKeys();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        if (path.startsWith("/actuator")) {
            return chain.filter(exchange);
        }

        String key = exchange.getRequest().getHeaders().getFirst(API_KEY_HEADER);
        if (key != null && validKeys.contains(key)) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        // Run before routing filters so unauthenticated requests never reach downstream services.
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
