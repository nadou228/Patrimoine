package com.patris.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.patris.enums.categorie;
import com.patris.enums.statutValidation;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "bien")
public class Bien {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String codeBien;
    @Column(unique = true)
    private String iup;
    private String designation;

    @Enumerated(EnumType.STRING)
    private categorie categorie;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateAcquisition;
    private double valeur;
    private String etat;
    private String localisation;
    private String coordonneeGps;
    private String photoUrl;
    private String observation;
    
    // Nouveaux champs spÃ©cifiques
    private String numInventaire;
    private String titreFoncier;
    private String superficie;
    private String coordonneesGps;
    private String modeAcquisition;
    private String immatriculation;
    private String numChassis;
    private String marque;
    private String modele;
    private String numSerie;
    private String fabricant;
    private Integer dureeAmortissement;
    private Integer dureeVie;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double valeurComptable;
    private Double amortissementCumule;
    private String validerPar;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateValidation; 

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    private boolean archived = false;


} 
