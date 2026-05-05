package com.patris.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Getter;
import lombok.Setter;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = BienImmobilierDto.class, name = "IMMOBILIER"),
    @JsonSubTypes.Type(value = BienMobilierDto.class, name = "MOBILIER"),
    @JsonSubTypes.Type(value = BienMaterielRoulantDto.class, name = "MATERIEL_ROULANT")
})
@Getter
@Setter
public abstract class BienDto {
    private Long id;
    private String codeBien;
    private String iup;
    private String designation;
    
    private String codeCategorie; // Identifiant de la CategoriePatrimoine
    private String codeFamille;
    private String codeSousCategorie;
    private String codeArticle;
    private NomenclatureRefDto nomenclature;
    
    // Champs communs
    private String dateAcquisition;
    private Double valeur;
    private String etat;
    private String localisation;
    private String service;
    private String photoUrl;
    private java.util.List<String> documentsUrls;
    private String observation;
    private String modeAcquisition;

    private Integer dureeAmortissement;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double valeurComptable;
    private Double amortissementCumule;
    
    private String validerPar;
    private String dateValidation;
    private String statutValidation;
    private String statutOperationnel;

    private Long sourceStockId;
    private Integer sourceStockQuantite;
    /** Obligatoire si sourceStockId est renseigné : bénéficiaire de la sortie de stock (traçabilité). */
    private Long sourceBeneficiaireId;

    private Boolean archived;

    public BienDto() {}
}
