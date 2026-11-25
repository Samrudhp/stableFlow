package com.stableflow.notification.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.stableflow.notification.domain.Notification;
import com.stableflow.notification.repository.NotificationRepository;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository repository;
    public NotificationController(NotificationRepository repository) { this.repository = repository; }
    @GetMapping public List<Notification> all() { return repository.findAllByOrderByCreatedAtDesc(); }
    @GetMapping("/{notificationId}")
    public Notification get(@PathVariable UUID notificationId) {
        return repository.findById(notificationId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }
}
