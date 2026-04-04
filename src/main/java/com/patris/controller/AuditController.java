package com.patris.controller;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import com.patris.audit.AuditLog;
import com.patris.audit.AuditLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository repository;

    @GetMapping
    public List<AuditLog> findAll() {
        return repository.findAll();
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable("id") Long id) {
        repository.deleteById(id);
    }
}
