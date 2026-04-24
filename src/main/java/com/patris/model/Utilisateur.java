package com.patris.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import com.patris.enums.role;

@Entity
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
    private String password;

    @Enumerated(EnumType.STRING)
    private role role;

    private boolean twoFactorEnabled;

    public Utilisateur() {
        this.twoFactorEnabled = false;
    }

    public Utilisateur(Long id, String nom, String prenom, String fonction, String username, String email, String telephone, String password, com.patris.enums.role role, boolean twoFactorEnabled) {
        this.id = id;
        this.nom = nom;
        this.prenom = prenom;
        this.fonction = fonction;
        this.username = username;
        this.email = email;
        this.telephone = telephone;
        this.password = password;
        this.role = role;
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public String getFonction() { return fonction; }
    public void setFonction(String fonction) { this.fonction = fonction; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public role getRole() { return role; }
    public void setRole(role role) { this.role = role; }
    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }
}
