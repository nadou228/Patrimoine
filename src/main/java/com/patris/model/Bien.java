package com.patris.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
    private String designation;

    @Enumerated(EnumType.STRING)
    private categorie categorie;

    private LocalDateTime dateAcquisition;
    private double valeur;
    private String etat;
    private String localisation;
    private String observation;
    private Integer dureeAmortissement;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double amortissementCumule;
    private String validerPar;
    private LocalDateTime dateValidation; 

    // Nouveaux champs issus des maquettes UI
    private String sousCategorie;
    private String description;
    @Column(columnDefinition = "TEXT")
    private String photoUrl;
    @Column(columnDefinition = "TEXT")
    private String documentFactureUrl;
    private String modeAcquisition;
    private String site;
    private String batiment;
    private String sourceFinancement;

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;


} 