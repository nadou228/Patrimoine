package com.patris.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.patris.enums.inventaireStatut;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "inventaire_campagne")
public class InventaireCampagne {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String sites;
    private String equipes;

    private LocalDate dateDebut;
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    private inventaireStatut statut;

    private String creePar;
    private LocalDateTime dateCreation;
    private String validePar;

    public InventaireCampagne() {}

    public InventaireCampagne(Long id, String nom, String sites, String equipes, LocalDate dateDebut, LocalDate dateFin, inventaireStatut statut, String creePar, LocalDateTime dateCreation, String validePar) {
        this.id = id;
        this.nom = nom;
        this.sites = sites;
        this.equipes = equipes;
        this.dateDebut = dateDebut;
        this.dateFin = dateFin;
        this.statut = statut;
        this.creePar = creePar;
        this.dateCreation = dateCreation;
        this.validePar = validePar;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getSites() { return sites; }
    public void setSites(String sites) { this.sites = sites; }
    public String getEquipes() { return equipes; }
    public void setEquipes(String equipes) { this.equipes = equipes; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public inventaireStatut getStatut() { return statut; }
    public void setStatut(inventaireStatut statut) { this.statut = statut; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    public String getValidePar() { return validePar; }
    public void setValidePar(String validePar) { this.validePar = validePar; }
}
