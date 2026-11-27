package com.stableflow.gateway.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Disables Spring Security's default browser-oriented protections (form login,
 * HTTP Basic prompt, CSRF tokens) that would interfere with a REST API gateway.
 * Actual authentication is handled by ApiKeyAuthFilter before requests reach
 * the security layer.
 *
 * /actuator/** is permitted without credentials so liveness and readiness
 * probes work inside Kubernetes without needing an API key.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/actuator/**").permitAll()
                        .anyExchange().permitAll()   // gate kept by ApiKeyAuthFilter
                )
                .build();
    }
}
