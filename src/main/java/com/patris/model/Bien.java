package com.patris.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.patris.enums.statutOperationnel;
import com.patris.enums.statutValidation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "bien")
@Inheritance(strategy = InheritanceType.JOINED)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public abstract class Bien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String iup;
    
    private String codeBien;
    private String designation;

    @Column(name = "code_categorie", nullable = false)
    private String codeCategorie; // FK vers CategoriePatrimoine (code)
    private String codeFamille;
    private String codeSousCategorie;
    private String codeArticle;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateAcquisition;
    
    private double valeur;
    private String etat;
    private String localisation;
    private String service; // Service ou département détenteur
    private String modeAcquisition;
    private String observation;
    private String photoUrl;

    private Integer dureeAmortissement;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double amortissementCumule;
    private Double valeurComptable;

    private String validerPar;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateValidation; 

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    @Enumerated(EnumType.STRING)
    private statutOperationnel statutOperationnel;

    private Boolean archived;

    public Bien() {
        this.archived = false;
        this.statutOperationnel = com.patris.enums.statutOperationnel.ACTIF;
    }
}
