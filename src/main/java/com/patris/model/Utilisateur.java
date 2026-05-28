package com.patris.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.patris.enums.StatutUtilisateur;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "utilisateur")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    private String fonction;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String telephone;

    /**
     * Jamais exposé en réponse JSON ({@link JsonProperty.Access#WRITE_ONLY}).
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    private boolean twoFactorEnabled;

    /** Clé secrète TOTP (Base32) utilisée pour la 2FA — jamais exposée en JSON. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String twoFactorSecret;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private StatutUtilisateur statut = StatutUtilisateur.ACTIF;

    private LocalDateTime derniereConnexion;

    /** Renseigné automatiquement à la création ; nullable pour compatibilité données historiques. */
    private LocalDateTime dateCreation;

    /** Username de l'administrateur ayant créé le compte (traçabilité). */
    private String creePar;

    /** Direction / service d'affectation. */
    private String service;

    /** Identifiant ministériel unique (peut être renseigné ultérieurement pour les comptes historiques). */
    @Column(unique = true)
    private String matricule;

    /** Si vrai, l'utilisateur doit changer son mot de passe après connexion. */
    @Column(nullable = false)
    private boolean mustChangePassword = false;

    /** Archivage logique : compte masqué des listes sans suppression physique. */
    @Column(nullable = false)
    private boolean archived = false;

    public Utilisateur() {
        this.twoFactorEnabled = false;
        this.statut = StatutUtilisateur.ACTIF;
        this.mustChangePassword = false;
        this.archived = false;
    }

    @PrePersist
    public void prePersist() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
        if (statut == null) {
            statut = StatutUtilisateur.ACTIF;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getFonction() {
        return fonction;
    }

    public void setFonction(String fonction) {
        this.fonction = fonction;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public String getTwoFactorSecret() {
        return twoFactorSecret;
    }

    public void setTwoFactorSecret(String twoFactorSecret) {
        this.twoFactorSecret = twoFactorSecret;
    }

    public StatutUtilisateur getStatut() {
        return statut;
    }

    public void setStatut(StatutUtilisateur statut) {
        this.statut = statut;
    }

    public LocalDateTime getDerniereConnexion() {
        return derniereConnexion;
    }

    public void setDerniereConnexion(LocalDateTime derniereConnexion) {
        this.derniereConnexion = derniereConnexion;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public String getCreePar() {
        return creePar;
    }

    public void setCreePar(String creePar) {
        this.creePar = creePar;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
