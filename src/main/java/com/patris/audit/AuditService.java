package com.patris.audit;


import java.time.LocalDateTime;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;


import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    public void save(String action, String entite, Long entiteId) {

        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntite(entite);
        log.setEntiteId(entiteId);
        log.setUsername(username);
        log.setDateAction(LocalDateTime.now());

        repository.save(log);
    }
}

