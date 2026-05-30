package com.patris.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.patris.enums.statutOperationnel;
import com.patris.enums.statutValidation;
import jakarta.persistence.*;
import jakarta.persistence.FetchType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@Entity
@Table(name = "bien")
@Inheritance(strategy = InheritanceType.JOINED)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type",
    defaultImpl = BienMobilier.class
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = BienMobilier.class, name = "MOBILIER"),
    @JsonSubTypes.Type(value = BienImmobilier.class, name = "IMMOBILIER"),
    @JsonSubTypes.Type(value = BienMaterielRoulant.class, name = "MATERIEL_ROULANT")
})
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

    @ManyToOne
    @JoinColumn(name = "nomenclature_code")
    private NomenclatureCompte nomenclature;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateAcquisition;
    
    private double valeur;
    private String etat;
    private String localisation;
    private String service; // Service ou département détenteur
    private String observation;
    
    // Champs comptables additionnels pour les annexes
    private Double quantite;
    private String unite;
    private String fournisseur;
    private String referenceFacture;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "bien_documents", joinColumns = @JoinColumn(name = "bien_id"))
    @Column(name = "document_url")
    private java.util.List<String> documentsUrls = new java.util.ArrayList<>();

    private Integer dureeAmortissement;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double amortissementCumule;
    private Double valeurComptable;

    private String validerPar;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
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

    @Enumerated(EnumType.STRING)
    private statutOperationnel statutOperationnel;

    private Boolean archived;

    public Bien() {
        this.archived = false;
        this.statutOperationnel = com.patris.enums.statutOperationnel.ACTIF;
    }

    public String getCompteComptable() {
        if (nomenclature != null && nomenclature.getCode() != null) {
            return nomenclature.getCode();
        }
        if (codeFamille != null) {
            return codeFamille;
        }
        return "2441"; // Default account
    }
}
