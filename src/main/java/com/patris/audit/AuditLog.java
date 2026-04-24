package com.patris.audit;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;
    private String entite;
    private Long entiteId;
    private String username;
    private LocalDateTime dateAction;

    public AuditLog() {}

    public AuditLog(Long id, String action, String entite, Long entiteId, String username, LocalDateTime dateAction) {
        this.id = id;
        this.action = action;
        this.entite = entite;
        this.entiteId = entiteId;
        this.username = username;
        this.dateAction = dateAction;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getEntite() { return entite; }
    public void setEntite(String entite) { this.entite = entite; }
    public Long getEntiteId() { return entiteId; }
    public void setEntiteId(Long entiteId) { this.entiteId = entiteId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public LocalDateTime getDateAction() { return dateAction; }
    public void setDateAction(LocalDateTime dateAction) { this.dateAction = dateAction; }
}
