package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.type_mouvement;
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
@Table(name = "mouvement")
public class Mouvement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    private type_mouvement type;
    
    private LocalDateTime dateCreation;
    
    @ManyToOne
    @JoinColumn(name = "service_source_id")
    private Services serviceSource;
    
    @ManyToOne
    @JoinColumn(name = "service_destination_id")
    private Services serviceDestination;

    private String observation; 

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    private String validePar;
    private LocalDateTime dateValidation;
    
    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    // Constructors
    public Mouvement() {}

    public Mouvement(Long id, type_mouvement type, LocalDateTime dateCreation, Services serviceSource, Services serviceDestination, String observation, statutValidation statutValidation, String validePar, LocalDateTime dateValidation, Bien bien) {
        this.id = id;
        this.type = type;
        this.dateCreation = dateCreation;
        this.serviceSource = serviceSource;
        this.serviceDestination = serviceDestination;
        this.observation = observation;
        this.statutValidation = statutValidation;
        this.validePar = validePar;
        this.dateValidation = dateValidation;
        this.bien = bien;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public type_mouvement getType() { return type; }
    public void setType(type_mouvement type) { this.type = type; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public Services getServiceSource() { return serviceSource; }
    public void setServiceSource(Services serviceSource) { this.serviceSource = serviceSource; }

    public Services getServiceDestination() { return serviceDestination; }
    public void setServiceDestination(Services serviceDestination) { this.serviceDestination = serviceDestination; }

    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }

    public statutValidation getStatutValidation() { return statutValidation; }
    public void setStatutValidation(statutValidation statutValidation) { this.statutValidation = statutValidation; }

    public String getValidePar() { return validePar; }
    public void setValidePar(String validePar) { this.validePar = validePar; }

    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }
}
