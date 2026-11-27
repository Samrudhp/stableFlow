package com.stableflow.gateway.security;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds the list of valid API keys from application.yml (gateway.auth.keys).
 * Keys are plain strings for the educational demo; a real system would store
 * hashed values and load them from a secrets manager.
 */
@Component
@ConfigurationProperties(prefix = "gateway.auth")
public class ApiKeyProperties {

    private List<String> keys = List.of();

    public List<String> getKeys() {
        return keys;
    }

    public void setKeys(List<String> keys) {
        this.keys = keys;
    }
}
