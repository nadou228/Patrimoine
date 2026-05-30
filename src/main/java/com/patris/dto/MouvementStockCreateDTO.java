package com.patris.dto;

import java.time.LocalDateTime;

public class MouvementStockCreateDTO {
    private Long consommableId;
    private Long magasinId;
    private LocalDateTime dateOperation;
    private String typeOperation;
    private String pieceJustificative;
    private int quantite;
    private Double prixUnitaire;
    private String observations;
    private String fournisseur;
    private Long beneficiaireId;
    private String destination;
    private String beneficiaireLibre;

    public MouvementStockCreateDTO() {}

    public Long getConsommableId() { return consommableId; }
    public void setConsommableId(Long consommableId) { this.consommableId = consommableId; }
    public Long getMagasinId() { return magasinId; }
    public void setMagasinId(Long magasinId) { this.magasinId = magasinId; }
    public LocalDateTime getDateOperation() { return dateOperation; }
    public void setDateOperation(LocalDateTime dateOperation) { this.dateOperation = dateOperation; }
    public String getTypeOperation() { return typeOperation; }
    public void setTypeOperation(String typeOperation) { this.typeOperation = typeOperation; }
    public String getPieceJustificative() { return pieceJustificative; }
    public void setPieceJustificative(String pieceJustificative) { this.pieceJustificative = pieceJustificative; }
    public int getQuantite() { return quantite; }
    public void setQuantite(int quantite) { this.quantite = quantite; }
    public Double getPrixUnitaire() { return prixUnitaire; }
    public void setPrixUnitaire(Double prixUnitaire) { this.prixUnitaire = prixUnitaire; }
    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
    public String getFournisseur() { return fournisseur; }
    public void setFournisseur(String fournisseur) { this.fournisseur = fournisseur; }
    public Long getBeneficiaireId() { return beneficiaireId; }
    public void setBeneficiaireId(Long beneficiaireId) { this.beneficiaireId = beneficiaireId; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public String getBeneficiaireLibre() { return beneficiaireLibre; }
    public void setBeneficiaireLibre(String beneficiaireLibre) { this.beneficiaireLibre = beneficiaireLibre; }
}
