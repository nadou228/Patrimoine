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
        save(action, entite, entiteId, null);
    }

    public void save(String action, String entite, Long entiteId, String detail) {
        save(action, entite, entiteId, detail, null, null);
    }

    public void save(String action, String entite, Long entiteId, String detail, String ancienneValeur, String nouvelleValeur) {
        String username = "system";
        try {
            if (SecurityContextHolder.getContext() != null && 
                SecurityContextHolder.getContext().getAuthentication() != null) {
                username = SecurityContextHolder.getContext().getAuthentication().getName();
            }
        } catch (Exception e) {}

        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntite(entite);
        log.setEntiteId(entiteId);
        log.setUsername(username);
        log.setDateAction(LocalDateTime.now());
        log.setDetail(detail);
        log.setAncienneValeur(ancienneValeur);
        log.setNouvelleValeur(nouvelleValeur);

        repository.save(log);
    }
}

