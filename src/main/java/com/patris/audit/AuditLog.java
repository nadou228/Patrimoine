package com.patris.audit;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
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
    private String utilisateurLogin;
    private String utilisateurNom;
    private String ipAdresse;
    private LocalDateTime dateAction;

    @Column(length = 2000)
    private String detail;

    @Column(length = 4000)
    private String details;

    @Column(length = 2000)
    private String ancienneValeur;

    @Column(length = 2000)
    private String nouvelleValeur;

    public AuditLog() {}

    public AuditLog(Long id, String action, String entite, Long entiteId, String username, LocalDateTime dateAction) {
        this.id = id;
        this.action = action;
        this.entite = entite;
        this.entiteId = entiteId;
        this.username = username;
        this.utilisateurLogin = username;
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
    public String getUsername() { return username != null ? username : utilisateurLogin; }
    public void setUsername(String username) {
        this.username = username;
        if (this.utilisateurLogin == null || this.utilisateurLogin.isBlank()) {
            this.utilisateurLogin = username;
        }
    }
    public String getUtilisateurLogin() { return utilisateurLogin != null ? utilisateurLogin : username; }
    public void setUtilisateurLogin(String utilisateurLogin) {
        this.utilisateurLogin = utilisateurLogin;
        if (this.username == null || this.username.isBlank()) {
            this.username = utilisateurLogin;
        }
    }
    public String getUtilisateurNom() { return utilisateurNom; }
    public void setUtilisateurNom(String utilisateurNom) { this.utilisateurNom = utilisateurNom; }
    public String getIpAdresse() { return ipAdresse; }
    public void setIpAdresse(String ipAdresse) { this.ipAdresse = ipAdresse; }
    public LocalDateTime getDateAction() { return dateAction; }
    public void setDateAction(LocalDateTime dateAction) { this.dateAction = dateAction; }
    public String getDetail() { return detail != null ? detail : details; }
    public void setDetail(String detail) {
        this.detail = detail;
        if (this.details == null || this.details.isBlank()) {
            this.details = detail;
        }
    }
    public String getDetails() { return details != null ? details : detail; }
    public void setDetails(String details) {
        this.details = details;
        if (this.detail == null || this.detail.isBlank()) {
            this.detail = details;
        }
    }
    public String getAncienneValeur() { return ancienneValeur; }
    public void setAncienneValeur(String ancienneValeur) { this.ancienneValeur = ancienneValeur; }
    public String getNouvelleValeur() { return nouvelleValeur; }
    public void setNouvelleValeur(String nouvelleValeur) { this.nouvelleValeur = nouvelleValeur; }
}
