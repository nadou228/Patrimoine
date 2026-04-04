package com.patris.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.patris.enums.categorie;
import com.patris.enums.statutValidation;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BienDto {
    private Long id;
    private String codeBien;
    private String iup;
    private String designation;
    private String categorie;
    private String dateAcquisition;
    private Double valeur;
    private String etat;
    private String localisation;
    private String coordonneesGps;
    private String coordonneeGps;
    private String photoUrl;
    private String observation;

    private String numInventaire;
    private String titreFoncier;
    private String superficie;
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
    private String dateValidation;
    private String statutValidation;
    private Boolean archived;
}
