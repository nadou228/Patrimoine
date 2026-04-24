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

    public MouvementStockCreateDTO() {}

    public MouvementStockCreateDTO(Long consommableId, LocalDateTime dateOperation, String typeOperation, String pieceJustificative, int quantite, Double prixUnitaire, String observations) {
        this.consommableId = consommableId;
        this.dateOperation = dateOperation;
        this.typeOperation = typeOperation;
        this.pieceJustificative = pieceJustificative;
        this.quantite = quantite;
        this.prixUnitaire = prixUnitaire;
        this.observations = observations;
    }

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
}
