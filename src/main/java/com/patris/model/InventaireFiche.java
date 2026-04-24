package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.statutValidation;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "inventaire_fiche")
public class InventaireFiche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "campagne_id")
    private InventaireCampagne campagne;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    private String codeIup;
    private String etatConstate;
    private String localisationReelle;
    private String photoUrl;
    private String coordonneeGps;
    private String observation;
    private Boolean anomalie;

    @Enumerated(EnumType.STRING)
    private statutValidation validationAgent;

    @Enumerated(EnumType.STRING)
    private statutValidation validationSuperviseur;

    private String agentUsername;
    private String superviseurUsername;
    private LocalDateTime dateScan;

    // Constructors
    public InventaireFiche() {}

    public InventaireFiche(Long id, InventaireCampagne campagne, Bien bien, String codeIup, String etatConstate, String localisationReelle, String photoUrl, String coordonneeGps, String observation, Boolean anomalie, statutValidation validationAgent, statutValidation validationSuperviseur, String agentUsername, String superviseurUsername, LocalDateTime dateScan) {
        this.id = id;
        this.campagne = campagne;
        this.bien = bien;
        this.codeIup = codeIup;
        this.etatConstate = etatConstate;
        this.localisationReelle = localisationReelle;
        this.photoUrl = photoUrl;
        this.coordonneeGps = coordonneeGps;
        this.observation = observation;
        this.anomalie = anomalie;
        this.validationAgent = validationAgent;
        this.validationSuperviseur = validationSuperviseur;
        this.agentUsername = agentUsername;
        this.superviseurUsername = superviseurUsername;
        this.dateScan = dateScan;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public InventaireCampagne getCampagne() { return campagne; }
    public void setCampagne(InventaireCampagne campagne) { this.campagne = campagne; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }

    public String getCodeIup() { return codeIup; }
    public void setCodeIup(String codeIup) { this.codeIup = codeIup; }

    public String getEtatConstate() { return etatConstate; }
    public void setEtatConstate(String etatConstate) { this.etatConstate = etatConstate; }

    public String getLocalisationReelle() { return localisationReelle; }
    public void setLocalisationReelle(String localisationReelle) { this.localisationReelle = localisationReelle; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getCoordonneeGps() { return coordonneeGps; }
    public void setCoordonneeGps(String coordonneeGps) { this.coordonneeGps = coordonneeGps; }

    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }

    public Boolean getAnomalie() { return anomalie; }
    public void setAnomalie(Boolean anomalie) { this.anomalie = anomalie; }

    public statutValidation getValidationAgent() { return validationAgent; }
    public void setValidationAgent(statutValidation validationAgent) { this.validationAgent = validationAgent; }

    public statutValidation getValidationSuperviseur() { return validationSuperviseur; }
    public void setValidationSuperviseur(statutValidation validationSuperviseur) { this.validationSuperviseur = validationSuperviseur; }

    public String getAgentUsername() { return agentUsername; }
    public void setAgentUsername(String agentUsername) { this.agentUsername = agentUsername; }

    public String getSuperviseurUsername() { return superviseurUsername; }
    public void setSuperviseurUsername(String superviseurUsername) { this.superviseurUsername = superviseurUsername; }

    public LocalDateTime getDateScan() { return dateScan; }
    public void setDateScan(LocalDateTime dateScan) { this.dateScan = dateScan; }
}
